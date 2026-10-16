import { Injectable } from "@nestjs/common";
import {
  compareTasksDefault,
  type Dashboard,
  DASHBOARD_LIST_LIMIT,
  type DashboardQuery,
  type RefinementPipelineItem,
  type WorkItem,
} from "@tlh/shared-contracts";
import { notFound } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CapacityService } from "../capacity/capacity.service";
import type { AuthContext } from "../identity/auth-context";
import { ReleasesService } from "../releases/releases.service";
import { SprintsService } from "../sprints/sprints.service";
import { FocusQueueService } from "../tasks/focus-queue.service";
import { taskInclude, toTaskDto } from "../tasks/task.mapper";
import { TasksService } from "../tasks/tasks.service";
import { RefinementsService } from "../work-items/refinements.service";
import { WorkItemsService } from "../work-items/work-items.service";

const ref = { id: true, code: true, name: true } as const;

function limited<T>(items: T[]): { total: number; items: T[] } {
  return { total: items.length, items: items.slice(0, DASHBOARD_LIST_LIMIT) };
}

/**
 * Dashboard (§5): foco e atividades pessoais (§5.2.1, §5.2.2), entregas críticas, sprints ativas,
 * releases e refinamentos (§5.2.3–§5.2.6), na visão global ou contextual. Domínios separados (§3.2):
 * atividade pessoal nunca entra nos totais de entrega. Capacidade (§5.2.7) vem do `CapacityService`;
 * recomendações chegam depois.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
    private readonly focus: FocusQueueService,
    private readonly workItems: WorkItemsService,
    private readonly refinements: RefinementsService,
    private readonly sprints: SprintsService,
    private readonly releases: ReleasesService,
    private readonly capacity: CapacityService,
  ) {}

  async get(auth: AuthContext, query: DashboardQuery): Promise<Dashboard> {
    const [team, project, today] = await Promise.all([
      query.teamId ? this.prisma.team.findFirst({ where: { id: query.teamId, workspaceId: auth.workspaceId }, select: ref }) : null,
      query.projectId
        ? this.prisma.project.findFirst({ where: { id: query.projectId, workspaceId: auth.workspaceId }, select: ref })
        : null,
      this.tasks.today(auth),
    ]);
    if (query.teamId && !team) throw notFound("Time");
    if (query.projectId && !project) throw notFound("Projeto");

    const context = { teamId: query.teamId, projectId: query.projectId };
    const [rows, focus, activeTeams, activeProjects, activeDevelopers, deliveries, refinement, activeSprints, releases, capacity] = await Promise.all([
      this.prisma.task.findMany({
        where: { ...this.tasks.contextWhere(auth, query), status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } },
        include: taskInclude,
      }),
      // A prioridade pessoal não muda com o contexto (§5.4): a fila é sempre a mesma.
      this.focus.get(auth, today),
      this.prisma.team.count({ where: { workspaceId: auth.workspaceId, status: "ACTIVE" } }),
      this.prisma.project.count({ where: { workspaceId: auth.workspaceId, status: "ACTIVE" } }),
      this.prisma.developer.count({ where: { workspaceId: auth.workspaceId, status: "ACTIVE" } }),
      this.workItems.loadMany(
        auth,
        { ...this.workItems.contextWhere(context), executionStatus: { notIn: ["DONE", "CANCELLED"] } },
        today,
      ),
      this.refinements.pipeline(auth, context),
      this.sprints.list(auth, { ...context, status: "ACTIVE" }),
      this.releases.list(auth, context),
      this.capacity.dashboard(auth, context),
    ]);

    const open = rows.map((row) => toTaskDto(row, today)).sort(compareTasksDefault);
    return {
      today,
      context: { team, project },
      focus,
      personal: {
        openCount: open.length,
        inProgressCount: open.filter((t) => t.status === "IN_PROGRESS").length,
        overdue: open.filter((t) => t.dueState === "OVERDUE"),
        dueToday: open.filter((t) => t.dueState === "DUE_TODAY"),
        upcoming: open.filter((t) => t.dueState === "DUE_SOON"),
        blocked: open.filter((t) => t.status === "BLOCKED"),
      },
      deliveries: this.criticalDeliveries(deliveries),
      activeSprints,
      releases: releases.filter((r) => r.status === "PLANNED" || r.status === "IN_PROGRESS"),
      refinement: this.refinementSummary(refinement),
      capacity,
      organization: { activeTeams, activeProjects, activeDevelopers },
    };
  }

  /** Cada item aparece uma vez por lista, mesmo envolvendo vários times ou releases (§5.4, CA-010). */
  private criticalDeliveries(items: WorkItem[]): Dashboard["deliveries"] {
    const health = (value: WorkItem["tracking"]["health"]) => items.filter((item) => item.tracking.health === value);
    return {
      openCount: items.length,
      blocked: limited(health("BLOCKED")),
      delayed: limited(health("DELAYED")),
      atRisk: limited(health("AT_RISK")),
      forecastAfterCommitment: limited(
        items.filter(
          ({ tracking: t }) => t.committedDate !== null && t.manualForecastDate !== null && t.manualForecastDate > t.committedDate,
        ),
      ),
      stale: limited(items.filter((item) => item.tracking.stale)),
    };
  }

  private refinementSummary(pipeline: RefinementPipelineItem[]): Dashboard["refinement"] {
    const count = (status: WorkItem["refinementStatus"]) => pipeline.filter((p) => p.workItem.refinementStatus === status).length;
    return {
      needsRefinement: count("NEEDS_REFINEMENT"),
      analyzing: count("ANALYZING"),
      waitingInformation: count("WAITING_INFORMATION"),
      checklistIncomplete: pipeline.filter(
        (p) =>
          p.workItem.refinementStatus !== "READY" &&
          p.workItem.refinementStatus !== "CANCELLED" &&
          p.checklist.checked < p.checklist.total,
      ).length,
      notReadyForImminentSprint: limited(pipeline.filter((p) => p.notReadyForImminentSprint)),
    };
  }
}

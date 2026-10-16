import { Injectable } from "@nestjs/common";
import { compareTasksDefault, type Dashboard, type DashboardQuery } from "@tlh/shared-contracts";
import { notFound } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { AuthContext } from "../identity/auth-context";
import { FocusQueueService } from "../tasks/focus-queue.service";
import { taskInclude, toTaskDto } from "../tasks/task.mapper";
import { TasksService } from "../tasks/tasks.service";

const ref = { id: true, code: true, name: true } as const;

/**
 * Dashboard inicial (§5): foco principal e atividades pessoais (§5.2.1, §5.2.2) na visão global ou
 * contextual. Entregas, sprints e capacidade entram nas próximas etapas.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
    private readonly focus: FocusQueueService,
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

    const [rows, focus, activeTeams, activeProjects, activeDevelopers] = await Promise.all([
      this.prisma.task.findMany({
        where: { ...this.tasks.contextWhere(auth, query), status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } },
        include: taskInclude,
      }),
      // A prioridade pessoal não muda com o contexto (§5.4): a fila é sempre a mesma.
      this.focus.get(auth, today),
      this.prisma.team.count({ where: { workspaceId: auth.workspaceId, status: "ACTIVE" } }),
      this.prisma.project.count({ where: { workspaceId: auth.workspaceId, status: "ACTIVE" } }),
      this.prisma.developer.count({ where: { workspaceId: auth.workspaceId, status: "ACTIVE" } }),
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
      organization: { activeTeams, activeProjects, activeDevelopers },
    };
  }
}

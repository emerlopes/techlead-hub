import { Injectable } from "@nestjs/common";
import {
  addDays,
  CAPACITY_DEFAULT_DAYS,
  CAPACITY_MAX_DAYS,
  type CapacityIssue,
  capacityLevel,
  type CapacityOverview,
  type ContextLoad,
  type ContextRef,
  computeCapacity,
  type DashboardCapacity,
  type DemandItemDto,
  type DeveloperCapacity,
  type DeveloperCapacityDetail,
  isValidCapacityRange,
  type Period,
  type ProjectDemand,
  summarizeDemand,
  type TeamCapacity,
  utilizationPercent,
} from "@tlh/shared-contracts";
import type { Prisma } from "../../generated/prisma/client";
import { workspaceToday } from "../../common/context-rules";
import { fromIsoDate, notFound, ruleViolation, toIsoDate, toNumberOrNull } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { AuthContext } from "../identity/auth-context";
import { refSelect } from "../work-items/work-item.mapper";
import {
  datesOverlap,
  exceptionInclude,
  type ExceptionRow,
  scheduleInclude,
  toAllocationDto,
  toAllocationRule,
  toExceptionDto,
  toExceptionRule,
  toScheduleDto,
  toScheduleRule,
  validityOverlaps,
} from "./capacity.mapper";

const contextSelect = { ...refSelect, status: true } as const;
const DEV_FREE_THRESHOLD = 1;

/** Dados de uma pessoa necessários ao cálculo de um período. */
function developerSelect(from: Date, to: Date) {
  return {
    id: true,
    name: true,
    status: true,
    teams: { select: { teamId: true, startedAt: true, endedAt: true, team: { select: contextSelect } } },
    schedules: { where: validityOverlaps(from, to), include: scheduleInclude, orderBy: { validFrom: "asc" } },
    exceptions: { where: { cancelledAt: null, ...datesOverlap(from, to) }, include: exceptionInclude },
    allocations: {
      where: validityOverlaps(from, to),
      include: { team: { select: contextSelect }, project: { select: contextSelect } },
      orderBy: { validFrom: "asc" },
    },
  } satisfies Prisma.DeveloperSelect;
}
type DeveloperInputs = Prisma.DeveloperGetPayload<{ select: ReturnType<typeof developerSelect> }>;

type Computed = DeveloperCapacity & { daily: ReturnType<typeof computeCapacity>["daily"]; inputs: DeveloperInputs };

const ref = (value: { id: string; code: string; name: string }): ContextRef => ({ id: value.id, code: value.code, name: value.name });
const sumBy = <T>(list: readonly T[], pick: (item: T) => number) => Math.round(list.reduce((t, i) => t + pick(i), 0) * 100) / 100;

function load(allocatedHours: number, items: readonly DemandItemDto[], periodEnd: string): ContextLoad {
  const demand = summarizeDemand(items.map((i) => ({ remainingHours: i.remainingHours, committedDate: i.committedDate })), periodEnd);
  return {
    allocatedHours,
    demand,
    utilization: utilizationPercent(demand.dueHours, allocatedHours),
    level: capacityLevel(demand.dueHours, allocatedHours),
  };
}

/**
 * Capacidade e demanda derivadas na leitura (§18, §20, §25.5): nada calculado é persistido, então
 * ausências, jornadas e alocações novas valem imediatamente (RN-034, CA-015). A capacidade de cada
 * pessoa é calculada uma única vez; times e projetos recebem só a parcela alocada (RN-026, CA-021).
 */
@Injectable()
export class CapacityService {
  constructor(private readonly prisma: PrismaService) {}

  /** `?from&to` → período; padrão = hoje + `CAPACITY_DEFAULT_DAYS` (§25.6). */
  async resolvePeriod(auth: AuthContext, query: { from?: string; to?: string }): Promise<Period & { today: string }> {
    const today = await workspaceToday(this.prisma, auth.workspaceId);
    const from = query.from ?? today;
    const to = query.to ?? addDays(from, CAPACITY_DEFAULT_DAYS - 1);
    if (!isValidCapacityRange(from, to)) {
      throw ruleViolation(`Informe um período válido de até ${CAPACITY_MAX_DAYS} dias (§25.6).`, "to");
    }
    return { from, to, today };
  }

  async overview(auth: AuthContext, query: { from?: string; to?: string; teamId?: string; projectId?: string }): Promise<CapacityOverview> {
    const { from, to, today } = await this.resolvePeriod(auth, query);
    const [developers, holidays, demand, teams, projects] = await Promise.all([
      this.computeDevelopers(auth, from, to, today, this.scopeWhere(from, to, query)),
      this.holidays(auth, from, to),
      this.openDemand(auth, {}),
      this.prisma.team.findMany({
        where: { workspaceId: auth.workspaceId, status: "ACTIVE", ...(query.teamId && { id: query.teamId }) },
        select: refSelect,
        orderBy: { code: "asc" },
      }),
      this.prisma.project.findMany({
        where: { workspaceId: auth.workspaceId, status: { not: "ARCHIVED" }, ...(query.projectId && { id: query.projectId }) },
        select: refSelect,
        orderBy: { code: "asc" },
      }),
    ]);
    // Times e projetos usam todas as pessoas com alocação neles, não só as do filtro.
    const all = query.teamId || query.projectId ? await this.computeDevelopers(auth, from, to, today, this.scopeWhere(from, to, {})) : developers;

    return {
      period: { from, to },
      totals: {
        nominalHours: sumBy(developers, (d) => d.summary.nominalHours),
        unavailableHours: sumBy(developers, (d) => d.summary.unavailableHours),
        effectiveHours: sumBy(developers, (d) => d.summary.effectiveHours),
        allocatedHours: sumBy(developers, (d) => d.summary.allocatedHours),
        freeHours: sumBy(developers, (d) => d.summary.freeHours),
        overAllocatedHours: sumBy(developers, (d) => d.summary.overAllocatedHours),
      },
      developers: developers.map(publicCapacity),
      teams: teams.map((team) => ({
        team,
        ...load(
          this.allocatedTo(all, (a) => a.teamId === team.id),
          demand.filter((i) => i.executingTeam?.id === team.id),
          to,
        ),
      })),
      projects: projects.map((project) => ({
        project,
        ...load(
          this.allocatedTo(all, (a) => a.projectId === project.id),
          demand.filter((i) => i.projectId === project.id),
          to,
        ),
      })),
      absences: this.absences(developers, holidays),
    };
  }

  /** `GET /developers/{id}/capacity` (§36.5): resumo, dia a dia, jornadas, ausências e alocações. */
  async developer(auth: AuthContext, id: string, query: { from?: string; to?: string }): Promise<DeveloperCapacityDetail> {
    const { from, to, today } = await this.resolvePeriod(auth, query);
    const exists = await this.prisma.developer.findFirst({ where: { id, workspaceId: auth.workspaceId }, select: { id: true } });
    if (!exists) throw notFound("Desenvolvedor");
    const [[computed], holidays] = await Promise.all([this.computeDevelopers(auth, from, to, today, { id }), this.holidays(auth, from, to)]);
    if (!computed) throw notFound("Desenvolvedor");
    return {
      ...publicCapacity(computed),
      period: { from, to },
      days: computed.daily,
      schedules: computed.inputs.schedules.map(toScheduleDto),
      exceptions: this.absences([computed], holidays),
    };
  }

  /** `GET /teams/{id}/capacity` (§36.10). */
  async team(auth: AuthContext, id: string, query: { from?: string; to?: string }): Promise<TeamCapacity> {
    const { from, to, today } = await this.resolvePeriod(auth, query);
    const team = await this.prisma.team.findFirst({ where: { id, workspaceId: auth.workspaceId }, select: refSelect });
    if (!team) throw notFound("Time");
    const [developers, holidays, demand] = await Promise.all([
      this.computeDevelopers(auth, from, to, today, this.scopeWhere(from, to, { teamId: id })),
      this.holidays(auth, from, to),
      this.openDemand(auth, { tracking: { executingTeamId: id } }),
    ]);
    const members = developers.map((d) => ({
      developer: d.developer,
      isMember: this.isMemberDuring(d.inputs, id, from, to),
      allocatedToTeamHours: sumBy(
        d.allocations.filter((a) => a.allocation.team?.id === id),
        (a) => a.hours,
      ),
      summary: d.summary,
      issues: d.issues,
    }));
    return {
      team,
      period: { from, to },
      ...load(sumBy(members, (m) => m.allocatedToTeamHours), demand, to),
      members: members.sort((a, b) => b.allocatedToTeamHours - a.allocatedToTeamHours || a.developer.name.localeCompare(b.developer.name)),
      absences: this.absences(developers, holidays),
    };
  }

  /** `GET /projects/{id}/demand` (§36.10): demanda × capacidade alocada ao projeto, por time. */
  async projectDemand(auth: AuthContext, id: string, query: { from?: string; to?: string }): Promise<ProjectDemand> {
    const { from, to, today } = await this.resolvePeriod(auth, query);
    const project = await this.prisma.project.findFirst({ where: { id, workspaceId: auth.workspaceId }, select: refSelect });
    if (!project) throw notFound("Projeto");
    const [developers, demand] = await Promise.all([
      this.computeDevelopers(auth, from, to, today, { allocations: { some: { projectId: id, ...validityOverlaps(fromDate(from), fromDate(to)) } } }),
      this.openDemand(auth, { projectId: id }),
    ]);
    const projectAllocations = developers.flatMap((d) =>
      d.allocations.filter((a) => a.allocation.project?.id === id).map((a) => ({ ...a, developer: d.developer })),
    );
    const teams = new Map<string, ContextRef | null>();
    for (const item of demand) teams.set(item.executingTeam?.id ?? "", item.executingTeam);
    for (const a of projectAllocations) if (a.allocation.team) teams.set(a.allocation.team.id, a.allocation.team);

    const contributors = new Map<string, { developer: { id: string; name: string }; hours: number }>();
    for (const a of projectAllocations) {
      const entry = contributors.get(a.developer.id) ?? { developer: { id: a.developer.id, name: a.developer.name }, hours: 0 };
      entry.hours = Math.round((entry.hours + a.hours) * 100) / 100;
      contributors.set(a.developer.id, entry);
    }

    return {
      project,
      period: { from, to },
      ...load(sumBy(projectAllocations, (a) => a.hours), demand, to),
      byTeam: [...teams.entries()]
        .map(([teamId, team]) => ({
          team,
          demand: summarizeDemand(
            demand.filter((i) => (i.executingTeam?.id ?? "") === teamId),
            to,
          ),
          allocatedHours: sumBy(
            projectAllocations.filter((a) => (a.allocation.team?.id ?? "") === teamId),
            (a) => a.hours,
          ),
        }))
        .sort((a, b) => (a.team?.code ?? "~").localeCompare(b.team?.code ?? "~")),
      contributors: [...contributors.values()].sort((a, b) => b.hours - a.hours),
      items: demand.map(({ projectId: _projectId, ...item }) => item),
    };
  }

  /**
   * Capacidade planejada (alocada ao time durante a sprint) × demanda estimada do escopo vigente
   * (§5.2.4). Todo o escopo vence no fim da sprint.
   */
  async sprintLoads(
    auth: AuthContext,
    sprints: readonly { id: string; teamId: string; startDate: string; endDate: string; remaining: readonly (number | null)[] }[],
  ): Promise<Map<string, ContextLoad>> {
    const result = new Map<string, ContextLoad>();
    if (sprints.length === 0) return result;
    const from = sprints.reduce((min, s) => (s.startDate < min ? s.startDate : min), sprints[0]?.startDate ?? "");
    const to = sprints.reduce((max, s) => (s.endDate > max ? s.endDate : max), sprints[0]?.endDate ?? "");
    const teamIds = [...new Set(sprints.map((s) => s.teamId))];
    const [inputs, holidays] = await Promise.all([
      this.prisma.developer.findMany({
        where: { workspaceId: auth.workspaceId, allocations: { some: { teamId: { in: teamIds }, ...validityOverlaps(fromDate(from), fromDate(to)) } } },
        select: developerSelect(fromDate(from), fromDate(to)),
      }),
      this.holidays(auth, from, to),
    ]);
    for (const sprint of sprints) {
      let allocated = 0;
      for (const dev of inputs) {
        const own = dev.allocations.filter((a) => a.teamId === sprint.teamId);
        if (own.length === 0) continue;
        const computed = computeCapacity({
          from: sprint.startDate,
          to: sprint.endDate,
          schedules: dev.schedules.map(toScheduleRule),
          exceptions: [...dev.exceptions, ...holidays].map(toExceptionRule),
          allocations: dev.allocations.map(toAllocationRule),
        });
        allocated += own.reduce((t, a) => t + (computed.allocationHours[a.id] ?? 0), 0);
      }
      const capacity = Math.round(allocated * 100) / 100;
      const demand = summarizeDemand(
        sprint.remaining.map((remainingHours) => ({ remainingHours, committedDate: sprint.endDate })),
        sprint.endDate,
      );
      result.set(sprint.id, {
        allocatedHours: capacity,
        demand,
        utilization: utilizationPercent(demand.dueHours, capacity),
        level: capacityLevel(demand.dueHours, capacity),
      });
    }
    return result;
  }

  /** Bloco de capacidade do dashboard (§5.2.7), no período padrão a partir de hoje. */
  async dashboard(auth: AuthContext, context: { teamId?: string; projectId?: string }): Promise<DashboardCapacity> {
    const overview = await this.overview(auth, context);
    const developers = overview.developers;
    const overAllocated = developers.filter((d) => d.issues.some((i) => i.type === "OVER_ALLOCATED" || i.type === "PERCENTAGE_OVER_LIMIT"));
    const active = developers.filter((d) => d.developer.status === "ACTIVE");
    const withAllocations = new Set(developers.filter((d) => d.allocations.length > 0).map((d) => d.developer.id));
    return {
      period: overview.period,
      // Sem capacidade só preocupa quando há demanda a cumprir no período.
      overloadedTeams: overview.teams.filter((t) => t.level === "OVERLOADED" || (t.level === "NO_CAPACITY" && t.demand.dueHours > 0)),
      overAllocatedDevelopers: overAllocated,
      unallocatedHours: sumBy(active, (d) => d.summary.freeHours),
      developersWithFreeCapacity: active
        .filter((d) => d.summary.freeHours >= DEV_FREE_THRESHOLD)
        .sort((a, b) => b.summary.freeHours - a.summary.freeHours)
        .map((d) => ({ developer: { id: d.developer.id, name: d.developer.name }, freeHours: d.summary.freeHours })),
      projectConflicts: overAllocated.flatMap((d) => {
        const projects = new Map(d.allocations.filter((a) => a.hours > 0 && a.allocation.project).map((a) => [a.allocation.project?.id, a.allocation.project as ContextRef]));
        return projects.size >= 2
          ? [{ developer: { id: d.developer.id, name: d.developer.name }, projects: [...projects.values()], overAllocatedHours: d.summary.overAllocatedHours }]
          : [];
      }),
      // Ausências com impacto previsto: de quem tem capacidade alocada no período, e feriados.
      absences: overview.absences.filter((e) => e.developer === null || withAllocations.has(e.developer.id)),
      developersWithoutSchedule: active.filter((d) => d.summary.scheduledDays === 0).length,
    };
  }

  /* ------------------------------------------------------------------------ */

  /**
   * Pessoas consideradas numa visão: ativas ou com alocação no período; no contexto de um time, as que
   * participam dele ou têm alocação nele; no de um projeto, as que têm alocação nele.
   */
  private scopeWhere(from: string, to: string, context: { teamId?: string; projectId?: string }): Prisma.DeveloperWhereInput {
    const overlap = validityOverlaps(fromDate(from), fromDate(to));
    const and: Prisma.DeveloperWhereInput[] = [{ OR: [{ status: "ACTIVE" }, { allocations: { some: overlap } }] }];
    if (context.teamId) {
      and.push({ OR: [{ teams: { some: { teamId: context.teamId, endedAt: null } } }, { allocations: { some: { teamId: context.teamId, ...overlap } } }] });
    }
    if (context.projectId) and.push({ allocations: { some: { projectId: context.projectId, ...overlap } } });
    return { AND: and };
  }

  private async computeDevelopers(
    auth: AuthContext,
    from: string,
    to: string,
    today: string,
    where: Prisma.DeveloperWhereInput,
  ): Promise<Computed[]> {
    const [rows, holidays] = await Promise.all([
      this.prisma.developer.findMany({
        where: { ...where, workspaceId: auth.workspaceId },
        select: developerSelect(fromDate(from), fromDate(to)),
        orderBy: { name: "asc" },
      }),
      this.holidays(auth, from, to),
    ]);
    return rows.map((dev) => {
      const computed = computeCapacity({
        from,
        to,
        schedules: dev.schedules.map(toScheduleRule),
        exceptions: [...dev.exceptions, ...holidays].map(toExceptionRule),
        allocations: dev.allocations.map(toAllocationRule),
      });
      const allocations = dev.allocations.map((a) => ({
        allocation: toAllocationDto({ ...a, developer: { id: dev.id, name: dev.name } }, today),
        hours: computed.allocationHours[a.id] ?? 0,
      }));
      return {
        developer: { id: dev.id, name: dev.name, status: dev.status },
        teams: dev.teams.filter((m) => m.endedAt === null).map((m) => ref(m.team)),
        summary: computed.summary,
        allocations,
        issues: this.issues(dev, computed, from, to),
        daily: computed.daily,
        inputs: dev,
      };
    });
  }

  /** Inconsistências sinalizadas antes da previsão (§20.5). */
  private issues(dev: DeveloperInputs, computed: ReturnType<typeof computeCapacity>, from: string, to: string): CapacityIssue[] {
    const issues: CapacityIssue[] = [];
    const ids = (filter: (a: DeveloperInputs["allocations"][number]) => boolean) => dev.allocations.filter(filter).map((a) => a.id);
    for (const type of computed.issues) {
      if (type === "OVER_ALLOCATED") issues.push({ type, allocationIds: ids((a) => (computed.allocationHours[a.id] ?? 0) > 0) });
      if (type === "PERCENTAGE_OVER_LIMIT") issues.push({ type, allocationIds: ids((a) => a.allocationType === "PERCENTAGE") });
      if (type === "NO_SCHEDULE") issues.push({ type, allocationIds: computed.allocationsWithoutSchedule });
    }
    const outsideTeam = ids((a) => {
      if (!a.teamId) return false;
      const start = maxDate(toIsoDate(a.validFrom) ?? from, from);
      const end = minDate(toIsoDate(a.validUntil) ?? to, to);
      return !this.isMemberDuring(dev, a.teamId, start, end);
    });
    if (outsideTeam.length) issues.push({ type: "NOT_TEAM_MEMBER", allocationIds: outsideTeam });
    const inactive = ids((a) => dev.status === "INACTIVE" || a.team?.status === "INACTIVE" || a.project?.status === "ARCHIVED");
    if (inactive.length) issues.push({ type: "INACTIVE_CONTEXT", allocationIds: inactive });
    return issues;
  }

  private isMemberDuring(dev: DeveloperInputs, teamId: string, from: string, to: string): boolean {
    return dev.teams.some(
      (m) => m.teamId === teamId && m.startedAt.toISOString().slice(0, 10) <= to && (m.endedAt === null || m.endedAt.toISOString().slice(0, 10) >= from),
    );
  }

  private allocatedTo(developers: readonly Computed[], match: (a: { teamId: string | null; projectId: string | null }) => boolean): number {
    return sumBy(
      developers.flatMap((d) => d.allocations.filter((a) => match({ teamId: a.allocation.team?.id ?? null, projectId: a.allocation.project?.id ?? null }))),
      (a) => a.hours,
    );
  }

  /** Feriados do calendário do workspace (sem pessoa) que tocam o período. */
  private holidays(auth: AuthContext, from: string, to: string): Promise<ExceptionRow[]> {
    return this.prisma.availabilityException.findMany({
      where: { workspaceId: auth.workspaceId, developerId: null, cancelledAt: null, ...datesOverlap(fromDate(from), fromDate(to)) },
      include: exceptionInclude,
    });
  }

  private absences(developers: readonly Computed[], holidays: readonly ExceptionRow[]) {
    return [
      ...holidays.map(toExceptionDto),
      ...developers.flatMap((d) => d.inputs.exceptions.map(toExceptionDto)),
    ].sort((a, b) => a.startDate.localeCompare(b.startDate) || (a.developer?.name ?? "").localeCompare(b.developer?.name ?? ""));
  }

  /** Itens abertos com esforço restante do acompanhamento corrente (§14.3) e confiança da estimativa (§21.4). */
  private async openDemand(auth: AuthContext, where: Prisma.ExternalWorkItemWhereInput): Promise<(DemandItemDto & { projectId: string })[]> {
    const rows = await this.prisma.externalWorkItem.findMany({
      where: { ...where, workspaceId: auth.workspaceId, executionStatus: { notIn: ["DONE", "CANCELLED"] } },
      select: {
        id: true,
        externalKey: true,
        title: true,
        projectId: true,
        tracking: {
          select: {
            remainingEffortHours: true,
            committedDate: true,
            executingTeam: { select: refSelect },
            developer: { select: { id: true, name: true } },
          },
        },
        estimates: { orderBy: { estimatedAt: "desc" }, take: 1, select: { confidence: true } },
      },
      orderBy: { externalKey: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      externalKey: row.externalKey,
      title: row.title,
      projectId: row.projectId,
      executingTeam: row.tracking?.executingTeam ?? null,
      developer: row.tracking?.developer ?? null,
      remainingHours: toNumberOrNull(row.tracking?.remainingEffortHours ?? null),
      committedDate: toIsoDate(row.tracking?.committedDate ?? null),
      confidence: row.estimates[0]?.confidence ?? null,
    }));
  }
}

function publicCapacity({ developer, teams, summary, allocations, issues }: Computed): DeveloperCapacity {
  return { developer, teams, summary, allocations, issues };
}

function fromDate(value: string): Date {
  return fromIsoDate(value) as Date;
}

const maxDate = (a: string, b: string) => (a > b ? a : b);
const minDate = (a: string, b: string) => (a < b ? a : b);

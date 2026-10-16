import { Injectable } from "@nestjs/common";
import {
  type Allocation,
  type AllocationDetail,
  type allocationListQuerySchema,
  allocationValueIssue,
  type createAllocationSchema,
  type updateAllocationSchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { assertDeveloperActive, assertProjectsOpen, assertTeamsActive, workspaceToday } from "../../common/context-rules";
import {
  fromIsoDate,
  notFound,
  ruleViolation,
  toIsoDate,
  versionConflict,
} from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import { refSelect } from "../work-items/work-item.mapper";
import { allocationInclude, toAllocationDto } from "./capacity.mapper";

const ENTITY = "Alocação";
type Tx = Prisma.TransactionClient;

/** Fotografia após cada mudança (§20.5 "preservar histórico", RN-038). */
async function recordSnapshot(tx: Tx, allocationId: string, actorUserId: string, fields: string[]): Promise<void> {
  const a = await tx.capacityAllocation.findUniqueOrThrow({ where: { id: allocationId } });
  await tx.capacityAllocationHistory.create({
    data: {
      allocationId,
      actorUserId,
      changedFields: fields,
      teamId: a.teamId,
      projectId: a.projectId,
      allocationType: a.allocationType,
      allocationValue: a.allocationValue,
      period: a.period,
      validFrom: a.validFrom,
      validUntil: a.validUntil,
    },
  });
}

/**
 * Alocações entre times e projetos (§20). Somas acima da capacidade são permitidas e sinalizadas como
 * conflito na leitura (§20.5, CA-011) — o Tech Lead decide como resolver (§3.5).
 */
@Injectable()
export class AllocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext, query: z.output<typeof allocationListQuerySchema>): Promise<Allocation[]> {
    const today = await workspaceToday(this.prisma, auth.workspaceId);
    const rows = await this.prisma.capacityAllocation.findMany({
      where: {
        workspaceId: auth.workspaceId,
        developerId: query.developerId,
        teamId: query.teamId,
        projectId: query.projectId,
        ...(query.scope === "current" && { OR: [{ validUntil: null }, { validUntil: { gte: fromIsoDate(today) as Date } }] }),
      },
      include: allocationInclude,
      orderBy: [{ developer: { name: "asc" } }, { validFrom: "asc" }],
    });
    return rows.map((row) => toAllocationDto(row, today));
  }

  async get(auth: AuthContext, id: string): Promise<AllocationDetail> {
    const [row, today] = await Promise.all([
      this.prisma.capacityAllocation.findFirst({
        where: { id, workspaceId: auth.workspaceId },
        include: { ...allocationInclude, history: { orderBy: { changedAt: "desc" }, take: 100 } },
      }),
      workspaceToday(this.prisma, auth.workspaceId),
    ]);
    if (!row) throw notFound(ENTITY);
    const history = row.history;
    const ids = (pick: (h: (typeof history)[number]) => string | null) => history.flatMap((h) => pick(h) ?? []);
    const [teams, projects] = await Promise.all([
      this.prisma.team.findMany({ where: { id: { in: ids((h) => h.teamId) } }, select: refSelect }),
      this.prisma.project.findMany({ where: { id: { in: ids((h) => h.projectId) } }, select: refSelect }),
    ]);
    return {
      ...toAllocationDto(row, today),
      history: history.map((h) => ({
        id: h.id,
        changedAt: h.changedAt.toISOString(),
        changedFields: h.changedFields,
        team: teams.find((t) => t.id === h.teamId) ?? null,
        project: projects.find((p) => p.id === h.projectId) ?? null,
        allocationType: h.allocationType,
        value: h.allocationValue.toNumber(),
        period: h.period,
        validFrom: toIsoDate(h.validFrom) ?? "",
        validUntil: toIsoDate(h.validUntil),
      })),
    };
  }

  async create(auth: AuthContext, input: z.output<typeof createAllocationSchema>): Promise<AllocationDetail> {
    await assertDeveloperActive(this.prisma, auth.workspaceId, input.developerId, "developerId");
    if (input.teamId) await assertTeamsActive(this.prisma, auth.workspaceId, [input.teamId], "teamId");
    if (input.projectId) await assertProjectsOpen(this.prisma, auth.workspaceId, [input.projectId], "projectId");
    const validFrom = input.validFrom ?? (await workspaceToday(this.prisma, auth.workspaceId));

    const id = await this.prisma.$transaction(async (tx) => {
      const allocation = await tx.capacityAllocation.create({
        data: {
          workspaceId: auth.workspaceId,
          developerId: input.developerId,
          teamId: input.teamId ?? null,
          projectId: input.projectId ?? null,
          allocationType: input.allocationType,
          allocationValue: input.value,
          period: input.allocationType === "HOURS" ? input.period : null,
          validFrom: fromIsoDate(validFrom) as Date,
          validUntil: fromIsoDate(input.validUntil) ?? null,
          description: input.description ?? null,
        },
      });
      await recordSnapshot(tx, allocation.id, auth.userId, ["created"]);
      await this.audit.record(
        {
          action: "capacity_allocation.created",
          entityType: "capacity_allocation",
          entityId: allocation.id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { developerId: input.developerId, allocationType: input.allocationType },
        },
        tx,
      );
      return allocation.id;
    });
    return this.get(auth, id);
  }

  /** A combinação final (atual + alterações) passa pelas mesmas regras da criação. */
  async update(auth: AuthContext, id: string, input: z.output<typeof updateAllocationSchema>): Promise<AllocationDetail> {
    const { version, ...changes } = input;
    const current = await this.prisma.capacityAllocation.findFirst({ where: { id, workspaceId: auth.workspaceId } });
    if (!current) throw notFound(ENTITY);

    const next = {
      teamId: changes.teamId === undefined ? current.teamId : changes.teamId,
      projectId: changes.projectId === undefined ? current.projectId : changes.projectId,
      allocationType: changes.allocationType ?? current.allocationType,
      value: changes.value ?? current.allocationValue.toNumber(),
      period: changes.period === undefined ? current.period : changes.period,
      validFrom: changes.validFrom ?? toIsoDate(current.validFrom) ?? "",
      validUntil: changes.validUntil === undefined ? toIsoDate(current.validUntil) : changes.validUntil,
      description: changes.description === undefined ? current.description : changes.description,
    };
    if (next.allocationType === "PERCENTAGE") next.period = null;
    const valueIssue = allocationValueIssue(next);
    if (valueIssue) throw ruleViolation(valueIssue, "value");
    if (next.allocationType === "HOURS" && !next.period) throw ruleViolation("Informe a periodicidade das horas (§20.3).", "period");
    if (!next.teamId && !next.projectId && !next.description) {
      throw ruleViolation("Descreva a reserva geral (ex.: suporte).", "description");
    }
    if (next.validUntil && next.validUntil < next.validFrom) {
      throw ruleViolation("O fim da vigência não pode ser anterior ao início (§35.7).", "validUntil");
    }
    // Só destinos novos passam pela regra de contexto ativo; os antigos continuam válidos.
    if (next.teamId && next.teamId !== current.teamId) await assertTeamsActive(this.prisma, auth.workspaceId, [next.teamId], "teamId");
    if (next.projectId && next.projectId !== current.projectId) {
      await assertProjectsOpen(this.prisma, auth.workspaceId, [next.projectId], "projectId");
    }

    // Só o que mudou de fato: o formulário reenvia todos os campos.
    const before = {
      teamId: current.teamId,
      projectId: current.projectId,
      allocationType: current.allocationType,
      value: current.allocationValue.toNumber(),
      period: current.period,
      validFrom: toIsoDate(current.validFrom),
      validUntil: toIsoDate(current.validUntil),
      description: current.description,
    };
    const fields = (Object.keys(before) as (keyof typeof before)[]).filter((key) => before[key] !== next[key]);
    if (fields.length === 0) return this.get(auth, id);
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.capacityAllocation.updateMany({
        where: { id, workspaceId: auth.workspaceId, version },
        data: {
          teamId: next.teamId,
          projectId: next.projectId,
          allocationType: next.allocationType,
          allocationValue: next.value,
          period: next.period,
          validFrom: fromIsoDate(next.validFrom) as Date,
          validUntil: fromIsoDate(next.validUntil) ?? null,
          description: next.description,
          version: { increment: 1 },
        },
      });
      if (result.count === 0) throw versionConflict(ENTITY);
      await recordSnapshot(tx, id, auth.userId, fields);
      await this.audit.record(
        {
          action: "capacity_allocation.updated",
          entityType: "capacity_allocation",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { fields, fromVersion: version },
        },
        tx,
      );
    });
    return this.get(auth, id);
  }

  /**
   * Exclusão física só para alocação que ainda não começou: nada do histórico depende dela (§35.9).
   * As demais são encerradas informando o fim da vigência.
   */
  async remove(auth: AuthContext, id: string): Promise<void> {
    const [current, today] = await Promise.all([
      this.prisma.capacityAllocation.findFirst({ where: { id, workspaceId: auth.workspaceId } }),
      workspaceToday(this.prisma, auth.workspaceId),
    ]);
    if (!current) throw notFound(ENTITY);
    if ((toIsoDate(current.validFrom) ?? "") <= today) {
      throw ruleViolation("Alocação já vigente não é excluída: informe o fim da vigência para preservar o histórico (§20.5).");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.capacityAllocation.delete({ where: { id } });
      await this.audit.record(
        {
          action: "capacity_allocation.deleted",
          entityType: "capacity_allocation",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { developerId: current.developerId },
        },
        tx,
      );
    });
  }
}

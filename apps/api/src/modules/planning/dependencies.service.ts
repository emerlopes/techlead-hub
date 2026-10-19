import { Injectable } from "@nestjs/common";
import {
  type createWorkDependencySchema,
  createsCycle,
  type dependencyListQuerySchema,
  isClosedExecution,
  type releaseWorkDependencySchema,
  SCHEDULING_DEPENDENCY_TYPES,
  type updateWorkDependencySchema,
  type WorkDependency,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { ApiException } from "../../common/api-exception";
import { workspaceToday } from "../../common/context-rules";
import { changedFields, fromIsoDate, isUniqueViolation, notFound, ruleViolation, versionConflict } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import { dependencyInclude, isResolvedDependency, toDependencyDto } from "./planning.mapper";

const ENTITY = "Dependência";

/**
 * Dependências entre entregas (§24). Entre projetos e times são permitidas (§24.5); ciclos no grafo de
 * agendamento são rejeitados dentro da transação, com trava por workspace para que dois cadastros
 * simultâneos não formem um ciclo juntos (§35.7, CA-017). Liberar uma dependência vale na próxima
 * leitura da projeção (§24.5).
 */
@Injectable()
export class DependenciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext, query: z.output<typeof dependencyListQuerySchema>): Promise<WorkDependency[]> {
    const rows = await this.prisma.workDependency.findMany({
      where: {
        workspaceId: auth.workspaceId,
        ...(query.workItemId && { OR: [{ predecessorId: query.workItemId }, { successorId: query.workItemId }] }),
      },
      include: dependencyInclude,
      orderBy: [{ successor: { externalKey: "asc" } }, { createdAt: "asc" }],
    });
    const list = rows.map(toDependencyDto);
    return query.scope === "open" ? list.filter((d) => !isResolvedDependency(d)) : list;
  }

  /** Dependências em que um dos itens é o sucessor — o que eles esperam (relatório de release, §31.2). */
  async listForSuccessors(auth: AuthContext, workItemIds: string[]): Promise<WorkDependency[]> {
    const rows = await this.prisma.workDependency.findMany({
      where: { workspaceId: auth.workspaceId, successorId: { in: workItemIds } },
      include: dependencyInclude,
      orderBy: [{ successor: { externalKey: "asc" } }, { createdAt: "asc" }],
    });
    return rows.map(toDependencyDto);
  }

  async get(auth: AuthContext, id: string): Promise<WorkDependency> {
    const row = await this.prisma.workDependency.findFirst({ where: { id, workspaceId: auth.workspaceId }, include: dependencyInclude });
    if (!row) throw notFound(ENTITY);
    return toDependencyDto(row);
  }

  async create(auth: AuthContext, input: z.output<typeof createWorkDependencySchema>): Promise<WorkDependency> {
    const ids = [input.successorId, ...(input.predecessorId ? [input.predecessorId] : [])];
    const items = await this.prisma.externalWorkItem.findMany({
      where: { id: { in: ids }, workspaceId: auth.workspaceId },
      select: { id: true, externalKey: true, executionStatus: true },
    });
    const successor = items.find((i) => i.id === input.successorId);
    if (!successor) throw ruleViolation("Item não encontrado.", "successorId");
    if (isClosedExecution(successor.executionStatus)) {
      throw ruleViolation(`${successor.externalKey} já está encerrado: não há início a condicionar.`, "successorId");
    }
    if (input.predecessorId && !items.some((i) => i.id === input.predecessorId)) throw ruleViolation("Item não encontrado.", "predecessorId");

    try {
      const id = await this.prisma.$transaction(async (tx) => {
        if (input.predecessorId && SCHEDULING_DEPENDENCY_TYPES.includes(input.dependencyType)) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`work_dependencies:${auth.workspaceId}`}))`;
          const edges = await tx.workDependency.findMany({
            where: { workspaceId: auth.workspaceId, dependencyType: { in: [...SCHEDULING_DEPENDENCY_TYPES] }, predecessorId: { not: null } },
            select: { predecessorId: true, successorId: true },
          });
          const graph = edges.map((e) => ({ from: e.predecessorId as string, to: e.successorId }));
          if (createsCycle(graph, input.predecessorId, input.successorId)) {
            throw ruleViolation("Esta dependência fecharia um ciclo entre as entregas (CA-017).", "predecessorId");
          }
        }
        const dependency = await tx.workDependency.create({
          data: {
            workspaceId: auth.workspaceId,
            predecessorId: input.predecessorId ?? null,
            successorId: input.successorId,
            dependencyType: input.dependencyType,
            externalReference: input.externalReference ?? null,
            expectedReleaseDate: fromIsoDate(input.expectedReleaseDate) ?? null,
            notes: input.notes ?? null,
          },
        });
        await this.audit.record(
          {
            action: "work_dependency.created",
            entityType: "work_dependency",
            entityId: dependency.id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: { dependencyType: input.dependencyType, successorId: input.successorId, predecessorId: input.predecessorId ?? null },
          },
          tx,
        );
        return dependency.id;
      });
      return this.get(auth, id);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ApiException(409, "CONFLICT", "Esta dependência já está registrada.");
      throw error;
    }
  }

  /** Previsão de liberação, referência e observação. Só a externa tem data e referência. */
  async update(auth: AuthContext, id: string, input: z.output<typeof updateWorkDependencySchema>): Promise<WorkDependency> {
    const { version, ...changes } = input;
    const current = await this.prisma.workDependency.findFirst({ where: { id, workspaceId: auth.workspaceId } });
    if (!current) throw notFound(ENTITY);
    if (current.dependencyType !== "EXTERNAL") {
      if (changes.expectedReleaseDate) throw ruleViolation("Data de liberação só vale para dependência externa.", "expectedReleaseDate");
      if (changes.externalReference) throw ruleViolation("Referência externa só vale para dependência externa.", "externalReference");
    } else if (changes.externalReference === null) {
      throw ruleViolation("Descreva de quem ou do que depende.", "externalReference");
    }
    const fields = changedFields(changes);
    if (fields.length === 0) return this.get(auth, id);
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.workDependency.updateMany({
        where: { id, workspaceId: auth.workspaceId, version },
        data: {
          externalReference: changes.externalReference,
          expectedReleaseDate: current.dependencyType === "EXTERNAL" ? fromIsoDate(changes.expectedReleaseDate) : undefined,
          notes: changes.notes,
          version: { increment: 1 },
        },
      });
      if (result.count === 0) throw versionConflict(ENTITY);
      await this.audit.record(
        {
          action: "work_dependency.updated",
          entityType: "work_dependency",
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

  /** Liberação da dependência externa (§24.5). A interna se libera quando o predecessor conclui. */
  async release(auth: AuthContext, id: string, input: z.output<typeof releaseWorkDependencySchema>): Promise<WorkDependency> {
    const current = await this.prisma.workDependency.findFirst({ where: { id, workspaceId: auth.workspaceId } });
    if (!current) throw notFound(ENTITY);
    if (current.dependencyType !== "EXTERNAL") {
      throw ruleViolation("A dependência entre itens é liberada quando o predecessor é concluído.");
    }
    if (current.status === "RELEASED") throw ruleViolation("A dependência já foi liberada.");
    const releasedOn = input.actualReleaseDate ?? (await workspaceToday(this.prisma, auth.workspaceId));
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.workDependency.updateMany({
        where: { id, workspaceId: auth.workspaceId, version: input.version },
        data: { status: "RELEASED", actualReleaseDate: fromIsoDate(releasedOn) as Date, version: { increment: 1 } },
      });
      if (result.count === 0) throw versionConflict(ENTITY);
      await this.audit.record(
        {
          action: "work_dependency.released",
          entityType: "work_dependency",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { fromStatus: "OPEN", toStatus: "RELEASED" },
        },
        tx,
      );
    });
    return this.get(auth, id);
  }

  /** `DELETE /work-dependencies/{id}` (§36.12): remove a restrição; a auditoria guarda o registro. */
  async remove(auth: AuthContext, id: string): Promise<void> {
    const current = await this.prisma.workDependency.findFirst({ where: { id, workspaceId: auth.workspaceId } });
    if (!current) throw notFound(ENTITY);
    await this.prisma.$transaction(async (tx) => {
      await tx.workDependency.delete({ where: { id } });
      await this.audit.record(
        {
          action: "work_dependency.deleted",
          entityType: "work_dependency",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { dependencyType: current.dependencyType, successorId: current.successorId, predecessorId: current.predecessorId },
        },
        tx,
      );
    });
  }
}

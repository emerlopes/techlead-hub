import { Injectable } from "@nestjs/common";
import {
  type createCheckItemSchema,
  isClosedExecution,
  type RefinementPipelineItem,
  type refinementListQuerySchema,
  type updateCheckItemSchema,
  type updateRefinementSchema,
  type WorkItemDetail,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { workspaceToday } from "../../common/context-rules";
import { changedFields, notFound, ruleViolation, versionConflict } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import { refinementInclude, toRefinementDto } from "./refinement.mapper";
import { compareWorkItems, toWorkItemDto, workItemInclude } from "./work-item.mapper";
import { recordTrackingSnapshot, WorkItemsService } from "./work-items.service";

const STATUS_ORDER = ["WAITING_INFORMATION", "ANALYZING", "NEEDS_REFINEMENT", "READY", "CANCELLED"] as const;

/** Refinamentos (§15, §34.10): situação, checklist de prontidão e pendências. */
@Injectable()
export class RefinementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly workItems: WorkItemsService,
  ) {}

  /**
   * Pipeline (§15.2): itens com execução aberta. Alertas de sprint iminente primeiro, depois a
   * situação que mais pede ação (dúvidas → análise → aguardando → pronta).
   */
  async pipeline(auth: AuthContext, query: z.output<typeof refinementListQuerySchema>): Promise<RefinementPipelineItem[]> {
    const [rows, today] = await Promise.all([
      this.prisma.externalWorkItem.findMany({
        where: {
          workspaceId: auth.workspaceId,
          executionStatus: { notIn: ["DONE", "CANCELLED"] },
          ...this.workItems.contextWhere(query),
          ...(query.sprintId && {
            OR: [
              { sprintMemberships: { some: { sprintId: query.sprintId, exitedAt: null } } },
              { refinement: { intendedSprintId: query.sprintId } },
            ],
          }),
        },
        include: { ...workItemInclude, ...refinementInclude },
      }),
      workspaceToday(this.prisma, auth.workspaceId),
    ]);
    const now = new Date();
    return rows
      .map((row) => {
        const workItem = toWorkItemDto(row, today, now);
        const refinement = toRefinementDto(row, workItem, today);
        return {
          workItem,
          intendedSprint: refinement.intendedSprint,
          checklist: refinement.checklist,
          openQuestions: refinement.openQuestions,
          suggestReady: refinement.suggestReady,
          notReadyForImminentSprint: refinement.notReadyForImminentSprint,
        };
      })
      .sort(
        (a, b) =>
          Number(b.notReadyForImminentSprint) - Number(a.notReadyForImminentSprint) ||
          STATUS_ORDER.indexOf(a.workItem.refinementStatus) - STATUS_ORDER.indexOf(b.workItem.refinementStatus) ||
          compareWorkItems(a.workItem, b.workItem),
      );
  }

  async update(auth: AuthContext, workItemId: string, input: z.output<typeof updateRefinementSchema>): Promise<WorkItemDetail> {
    const { version, status, intendedSprintId, ...fields } = input;
    const current = await this.prisma.externalWorkItem.findFirst({
      where: { id: workItemId, workspaceId: auth.workspaceId },
      include: { refinement: { include: { checkItems: { select: { checkedAt: true } } } } },
    });
    if (!current?.refinement) throw notFound("Item");
    const refinement = current.refinement;

    if (intendedSprintId && intendedSprintId !== refinement.intendedSprintId) {
      const sprint = await this.prisma.sprint.findFirst({ where: { id: intendedSprintId, workspaceId: auth.workspaceId } });
      if (!sprint) throw ruleViolation("Sprint não encontrada.", "intendedSprintId");
      if (sprint.status !== "PLANNED" && sprint.status !== "ACTIVE") {
        throw ruleViolation("A sprint pretendida precisa estar planejada ou ativa.", "intendedSprintId");
      }
    }

    const nextStatus = status ?? current.refinementStatus;
    const statusChanged = nextStatus !== current.refinementStatus;
    const incomplete = refinement.checkItems.some((check) => check.checkedAt === null);
    const reason = fields.readyExceptionReason !== undefined ? fields.readyExceptionReason : refinement.readyExceptionReason;
    // Pronto com checklist incompleto é exceção e precisa de justificativa (§15.5).
    if (nextStatus === "READY" && incomplete && !reason) {
      throw ruleViolation(
        "O checklist de prontidão está incompleto. Justifique a exceção para marcar como pronta (§15.5).",
        "readyExceptionReason",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.externalWorkItem.updateMany({
        where: { id: workItemId, workspaceId: auth.workspaceId, version },
        data: { ...(statusChanged && { refinementStatus: nextStatus }), version: { increment: 1 } },
      });
      if (result.count === 0) throw versionConflict("Item");
      await tx.refinement.update({
        where: { id: refinement.id },
        data: {
          ...fields,
          intendedSprintId,
          // A justificativa só vale enquanto o item estiver pronto.
          ...(nextStatus !== "READY" && { readyExceptionReason: null }),
        },
      });
      if (statusChanged) await recordTrackingSnapshot(tx, workItemId, auth.userId, ["refinementStatus"]);
      await this.audit.record(
        {
          action: "refinement.updated",
          entityType: "work_item",
          entityId: workItemId,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: {
            fields: changedFields({ ...input }),
            fromVersion: version,
            ...(statusChanged && { fromStatus: current.refinementStatus, toStatus: nextStatus }),
          },
        },
        tx,
      );
    });
    return this.workItems.get(auth, workItemId);
  }

  async addCheckItem(auth: AuthContext, workItemId: string, input: z.output<typeof createCheckItemSchema>): Promise<WorkItemDetail> {
    const refinement = await this.prisma.refinement.findFirst({
      where: { workItemId, workItem: { workspaceId: auth.workspaceId } },
      include: { checkItems: { select: { position: true }, orderBy: { position: "desc" }, take: 1 } },
    });
    if (!refinement) throw notFound("Item");
    await this.prisma.$transaction(async (tx) => {
      const check = await tx.refinementCheckItem.create({
        data: { refinementId: refinement.id, label: input.label, position: (refinement.checkItems[0]?.position ?? -1) + 1 },
      });
      await this.audit.record(
        {
          action: "refinement_check_item.created",
          entityType: "refinement_check_item",
          entityId: check.id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { workItemId },
        },
        tx,
      );
    });
    return this.workItems.get(auth, workItemId);
  }

  async updateCheckItem(auth: AuthContext, id: string, input: z.output<typeof updateCheckItemSchema>): Promise<WorkItemDetail> {
    const check = await this.findCheckItem(auth, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.refinementCheckItem.update({ where: { id }, data: { checkedAt: input.checked ? (check.checkedAt ?? new Date()) : null } });
      await this.audit.record(
        {
          action: "refinement_check_item.updated",
          entityType: "refinement_check_item",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { workItemId: check.refinement.workItemId, checked: input.checked },
        },
        tx,
      );
    });
    return this.workItems.get(auth, check.refinement.workItemId);
  }

  /** Itens do checklist são configuráveis por refinamento (§15.4); remover é explícito e auditado. */
  async removeCheckItem(auth: AuthContext, id: string): Promise<WorkItemDetail> {
    const check = await this.findCheckItem(auth, id);
    if (isClosedExecution(check.refinement.workItem.executionStatus)) {
      throw ruleViolation("O checklist de itens encerrados é preservado como histórico (§13.6).");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.refinementCheckItem.delete({ where: { id } });
      await this.audit.record(
        {
          action: "refinement_check_item.deleted",
          entityType: "refinement_check_item",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { workItemId: check.refinement.workItemId },
        },
        tx,
      );
    });
    return this.workItems.get(auth, check.refinement.workItemId);
  }

  private async findCheckItem(auth: AuthContext, id: string) {
    const check = await this.prisma.refinementCheckItem.findFirst({
      where: { id, refinement: { workItem: { workspaceId: auth.workspaceId } } },
      include: { refinement: { select: { workItemId: true, workItem: { select: { executionStatus: true } } } } },
    });
    if (!check) throw notFound("Item do checklist");
    return check;
  }
}

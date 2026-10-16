import { Injectable } from "@nestjs/common";
import {
  type AvailabilityException,
  type cancelSchema,
  type createAvailabilityExceptionSchema,
  type exceptionListQuerySchema,
  type updateAvailabilityExceptionSchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { assertDeveloperActive, workspaceToday } from "../../common/context-rules";
import { changedFields, fromIsoDate, notFound, ruleViolation, toIsoDate, versionConflict } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import { exceptionInclude, toExceptionDto } from "./capacity.mapper";

const ENTITY = "Ausência";

/**
 * Ausências, folgas e feriados (§19.2, §19.3). Sem pessoa, o feriado vale para o workspace inteiro.
 * Cancelar preserva o registro (§35.9); a capacidade passa a desconsiderá-lo na próxima leitura.
 */
@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext, query: z.output<typeof exceptionListQuerySchema>): Promise<AvailabilityException[]> {
    const today = fromIsoDate(await workspaceToday(this.prisma, auth.workspaceId)) as Date;
    const where: Prisma.AvailabilityExceptionWhereInput = {
      workspaceId: auth.workspaceId,
      // O calendário do workspace vale para a pessoa também.
      ...(query.developerId && { OR: [{ developerId: query.developerId }, { developerId: null }] }),
      ...(query.scope === "upcoming" && { cancelledAt: null, endDate: { gte: today } }),
      ...(query.scope === "cancelled" && { cancelledAt: { not: null } }),
    };
    const rows = await this.prisma.availabilityException.findMany({
      where,
      include: exceptionInclude,
      orderBy: [{ startDate: query.scope === "upcoming" ? "asc" : "desc" }, { createdAt: "asc" }],
    });
    return rows.map(toExceptionDto);
  }

  async get(auth: AuthContext, id: string): Promise<AvailabilityException> {
    const row = await this.prisma.availabilityException.findFirst({
      where: { id, workspaceId: auth.workspaceId },
      include: exceptionInclude,
    });
    if (!row) throw notFound(ENTITY);
    return toExceptionDto(row);
  }

  async create(auth: AuthContext, input: z.output<typeof createAvailabilityExceptionSchema>): Promise<AvailabilityException> {
    const developerId = input.developerId ?? null;
    if (developerId) await assertDeveloperActive(this.prisma, auth.workspaceId, developerId, "developerId");
    const row = await this.prisma.$transaction(async (tx) => {
      const exception = await tx.availabilityException.create({
        data: {
          workspaceId: auth.workspaceId,
          developerId,
          type: input.type,
          startDate: fromIsoDate(input.startDate) as Date,
          endDate: fromIsoDate(input.endDate ?? input.startDate) as Date,
          unavailableHours: input.unavailableHours ?? null,
          description: input.description ?? null,
        },
      });
      // Tipo e período apenas: o motivo pode ser pessoal e não vai para a auditoria (§44.5).
      await this.audit.record(
        {
          action: "availability_exception.created",
          entityType: "availability_exception",
          entityId: exception.id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { type: exception.type, developerId, workspaceWide: developerId === null },
        },
        tx,
      );
      return exception;
    });
    return this.get(auth, row.id);
  }

  async update(auth: AuthContext, id: string, input: z.output<typeof updateAvailabilityExceptionSchema>): Promise<AvailabilityException> {
    const { version, startDate, endDate, ...fields } = input;
    const current = await this.prisma.availabilityException.findFirst({ where: { id, workspaceId: auth.workspaceId } });
    if (!current) throw notFound(ENTITY);
    if (current.cancelledAt) throw ruleViolation("Ausência cancelada não pode ser alterada.");
    if (current.developerId === null && fields.type && fields.type !== "HOLIDAY") {
      throw ruleViolation("Sem pessoa, só feriados do calendário do workspace.", "type");
    }
    const nextStart = startDate ?? toIsoDate(current.startDate) ?? "";
    const nextEnd = endDate ?? toIsoDate(current.endDate) ?? "";
    if (nextEnd < nextStart) throw ruleViolation("O fim não pode ser anterior ao início.", "endDate");

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.availabilityException.updateMany({
        where: { id, workspaceId: auth.workspaceId, version },
        data: { ...fields, startDate: fromIsoDate(nextStart) as Date, endDate: fromIsoDate(nextEnd) as Date, version: { increment: 1 } },
      });
      if (result.count === 0) throw versionConflict(ENTITY);
      await this.audit.record(
        {
          action: "availability_exception.updated",
          entityType: "availability_exception",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { fields: changedFields({ ...input }), fromVersion: version },
        },
        tx,
      );
    });
    return this.get(auth, id);
  }

  async cancel(auth: AuthContext, id: string, input: z.output<typeof cancelSchema>): Promise<AvailabilityException> {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.availabilityException.updateMany({
        where: { id, workspaceId: auth.workspaceId, version: input.version, cancelledAt: null },
        data: { cancelledAt: new Date(), version: { increment: 1 } },
      });
      if (result.count === 0) {
        const exists = await tx.availabilityException.findFirst({ where: { id, workspaceId: auth.workspaceId } });
        if (!exists) throw notFound(ENTITY);
        if (exists.cancelledAt) throw ruleViolation("Ausência já cancelada.");
        throw versionConflict(ENTITY);
      }
      await this.audit.record(
        {
          action: "availability_exception.cancelled",
          entityType: "availability_exception",
          entityId: id,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { fromVersion: input.version },
        },
        tx,
      );
    });
    return this.get(auth, id);
  }
}

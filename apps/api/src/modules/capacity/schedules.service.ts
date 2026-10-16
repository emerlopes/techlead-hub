import { Injectable } from "@nestjs/common";
import {
  addDays,
  type createWorkScheduleSchema,
  type scheduleListQuerySchema,
  type updateWorkScheduleSchema,
  type WorkSchedule,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { ApiException } from "../../common/api-exception";
import { assertDeveloperActive } from "../../common/context-rules";
import { changedFields, fromIsoDate, notFound, toIsoDate, versionConflict } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import { scheduleInclude, toScheduleDto } from "./capacity.mapper";

const ENTITY = "Jornada";
type Tx = Prisma.TransactionClient;

function overlapConflict(): ApiException {
  return new ApiException(409, "CONFLICT", "Já existe jornada vigente em parte desse período (§35.7).", {
    details: [{ path: "validFrom", message: "Vigência sobreposta a outra jornada da pessoa." }],
  });
}

/** Violação do EXCLUDE `work_schedules_no_overlap`: dois cadastros concorrentes para o mesmo período. */
function isOverlapViolation(error: unknown): boolean {
  return error instanceof Error && /work_schedules_no_overlap|23P01/.test(error.message);
}

/** Jornadas (§19.1): uma vigente por pessoa em cada dia; mudanças preservam o histórico (§19.4). */
@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext, query: z.output<typeof scheduleListQuerySchema>): Promise<WorkSchedule[]> {
    const rows = await this.prisma.workSchedule.findMany({
      where: { workspaceId: auth.workspaceId, developerId: query.developerId },
      include: scheduleInclude,
      orderBy: [{ developer: { name: "asc" } }, { validFrom: "desc" }],
    });
    return rows.map(toScheduleDto);
  }

  async get(auth: AuthContext, id: string): Promise<WorkSchedule> {
    const row = await this.prisma.workSchedule.findFirst({ where: { id, workspaceId: auth.workspaceId }, include: scheduleInclude });
    if (!row) throw notFound(ENTITY);
    return toScheduleDto(row);
  }

  /**
   * Nova jornada: a vigente que começou antes é encerrada no dia anterior ao início da nova, e as
   * duas ficam no histórico. Sobreposição com jornada futura é rejeitada.
   */
  async create(auth: AuthContext, input: z.output<typeof createWorkScheduleSchema>): Promise<WorkSchedule> {
    await assertDeveloperActive(this.prisma, auth.workspaceId, input.developerId, "developerId");
    const workspace = await this.prisma.workspace.findUniqueOrThrow({ where: { id: auth.workspaceId }, select: { timezone: true } });
    const validFrom = fromIsoDate(input.validFrom) as Date;
    const validUntil = fromIsoDate(input.validUntil) ?? null;

    const id = await this.prisma
      .$transaction(async (tx) => {
        const previous = await tx.workSchedule.findFirst({
          where: {
            developerId: input.developerId,
            validFrom: { lt: validFrom },
            OR: [{ validUntil: null }, { validUntil: { gte: validFrom } }],
          },
        });
        if (previous) {
          await tx.workSchedule.update({
            where: { id: previous.id },
            data: { validUntil: fromIsoDate(addDays(input.validFrom, -1)), version: { increment: 1 } },
          });
          await this.audit.record(
            {
              action: "work_schedule.ended",
              entityType: "work_schedule",
              entityId: previous.id,
              workspaceId: auth.workspaceId,
              actorUserId: auth.userId,
              metadata: { fields: ["validUntil"], fromVersion: previous.version },
            },
            tx,
          );
        }
        await this.assertNoOverlap(tx, input.developerId, validFrom, validUntil);
        const schedule = await tx.workSchedule.create({
          data: {
            workspaceId: auth.workspaceId,
            developerId: input.developerId,
            validFrom,
            validUntil,
            timezone: input.timezone ?? workspace.timezone,
            weeklyPattern: input.weeklyPattern,
            focusFactor: input.focusFactor,
          },
        });
        await this.audit.record(
          {
            action: "work_schedule.created",
            entityType: "work_schedule",
            entityId: schedule.id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: { developerId: input.developerId, endedPrevious: Boolean(previous) },
          },
          tx,
        );
        return schedule.id;
      })
      .catch((error: unknown) => {
        throw isOverlapViolation(error) ? overlapConflict() : error;
      });
    return this.get(auth, id);
  }

  async update(auth: AuthContext, id: string, input: z.output<typeof updateWorkScheduleSchema>): Promise<WorkSchedule> {
    const { version, validFrom, validUntil, ...fields } = input;
    const current = await this.prisma.workSchedule.findFirst({ where: { id, workspaceId: auth.workspaceId } });
    if (!current) throw notFound(ENTITY);
    const nextFrom = fromIsoDate(validFrom) ?? current.validFrom;
    const nextUntil = validUntil === undefined ? current.validUntil : fromIsoDate(validUntil);
    if (nextUntil && nextUntil < nextFrom) {
      throw new ApiException(422, "RULE_VIOLATION", "O fim da vigência não pode ser anterior ao início (§35.7).", {
        details: [{ path: "validUntil", message: `Use uma data a partir de ${toIsoDate(nextFrom)}.` }],
      });
    }

    await this.prisma
      .$transaction(async (tx) => {
        await this.assertNoOverlap(tx, current.developerId, nextFrom, nextUntil ?? null, id);
        const result = await tx.workSchedule.updateMany({
          where: { id, workspaceId: auth.workspaceId, version },
          data: { ...fields, validFrom: nextFrom, validUntil: nextUntil, version: { increment: 1 } },
        });
        if (result.count === 0) throw versionConflict(ENTITY);
        await this.audit.record(
          {
            action: "work_schedule.updated",
            entityType: "work_schedule",
            entityId: id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: { fields: changedFields({ ...input }), fromVersion: version },
          },
          tx,
        );
      })
      .catch((error: unknown) => {
        throw isOverlapViolation(error) ? overlapConflict() : error;
      });
    return this.get(auth, id);
  }

  /** Checagem explícita para uma mensagem clara; o EXCLUDE da migration garante sob concorrência. */
  private async assertNoOverlap(tx: Tx, developerId: string, from: Date, until: Date | null, exceptId?: string): Promise<void> {
    const clash = await tx.workSchedule.findFirst({
      where: {
        developerId,
        ...(exceptId && { id: { not: exceptId } }),
        ...(until && { validFrom: { lte: until } }),
        OR: [{ validUntil: null }, { validUntil: { gte: from } }],
      },
    });
    if (clash) throw overlapConflict();
  }
}

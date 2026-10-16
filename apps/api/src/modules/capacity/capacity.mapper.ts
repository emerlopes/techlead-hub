import type {
  Allocation,
  AllocationRule,
  AvailabilityException,
  ExceptionRule,
  ScheduleRule,
  WorkSchedule,
} from "@tlh/shared-contracts";
import { isInPeriod, weeklyHours } from "@tlh/shared-contracts";
import type { Prisma } from "../../generated/prisma/client";
import { toIsoDate, toIsoOrNull, toNumberOrNull } from "../../common/persistence";
import { refSelect } from "../work-items/work-item.mapper";

const developerRef = { select: { id: true, name: true } } as const;

export const scheduleInclude = { developer: developerRef } satisfies Prisma.WorkScheduleInclude;
export type ScheduleRow = Prisma.WorkScheduleGetPayload<{ include: typeof scheduleInclude }>;

export const exceptionInclude = { developer: developerRef } satisfies Prisma.AvailabilityExceptionInclude;
export type ExceptionRow = Prisma.AvailabilityExceptionGetPayload<{ include: typeof exceptionInclude }>;

export const allocationInclude = {
  developer: developerRef,
  team: { select: refSelect },
  project: { select: refSelect },
} satisfies Prisma.CapacityAllocationInclude;
export type AllocationRow = Prisma.CapacityAllocationGetPayload<{ include: typeof allocationInclude }>;

const date = (value: Date) => toIsoDate(value) ?? "";

export function toScheduleRule(row: Prisma.WorkScheduleGetPayload<object>): ScheduleRule {
  return {
    validFrom: date(row.validFrom),
    validUntil: toIsoDate(row.validUntil),
    weeklyPattern: row.weeklyPattern.map((hours) => hours.toNumber()),
    focusFactor: row.focusFactor.toNumber(),
  };
}

export function toScheduleDto(row: ScheduleRow): WorkSchedule {
  const rule = toScheduleRule(row);
  return {
    id: row.id,
    developer: row.developer,
    validFrom: rule.validFrom,
    validUntil: rule.validUntil,
    timezone: row.timezone,
    weeklyPattern: [...rule.weeklyPattern],
    weeklyHours: weeklyHours(rule.weeklyPattern),
    focusFactor: rule.focusFactor,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

export function toExceptionRule(row: Prisma.AvailabilityExceptionGetPayload<object>): ExceptionRule {
  return { startDate: date(row.startDate), endDate: date(row.endDate), unavailableHours: toNumberOrNull(row.unavailableHours) };
}

export function toExceptionDto(row: ExceptionRow): AvailabilityException {
  return {
    id: row.id,
    developer: row.developer,
    type: row.type,
    startDate: date(row.startDate),
    endDate: date(row.endDate),
    unavailableHours: toNumberOrNull(row.unavailableHours),
    description: row.description,
    cancelledAt: toIsoOrNull(row.cancelledAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

export function toAllocationRule(row: Prisma.CapacityAllocationGetPayload<object>): AllocationRule {
  return {
    id: row.id,
    type: row.allocationType,
    value: row.allocationValue.toNumber(),
    period: row.period,
    validFrom: date(row.validFrom),
    validUntil: toIsoDate(row.validUntil),
  };
}

export function toAllocationDto(row: AllocationRow, today: string): Allocation {
  const rule = toAllocationRule(row);
  return {
    id: row.id,
    developer: row.developer,
    team: row.team && { id: row.team.id, code: row.team.code, name: row.team.name },
    project: row.project && { id: row.project.id, code: row.project.code, name: row.project.name },
    allocationType: rule.type,
    value: rule.value,
    period: rule.period,
    validFrom: rule.validFrom,
    validUntil: rule.validUntil,
    description: row.description,
    active: isInPeriod(today, rule.validFrom, rule.validUntil),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

/** Vigência `[valid_from, valid_until]` que cruza o período `[from, to]`. */
export function validityOverlaps(from: Date, to: Date) {
  return { validFrom: { lte: to }, OR: [{ validUntil: null }, { validUntil: { gte: from } }] };
}

/** Exceção `[start_date, end_date]` que cruza o período `[from, to]`. */
export function datesOverlap(from: Date, to: Date) {
  return { startDate: { lte: to }, endDate: { gte: from } };
}

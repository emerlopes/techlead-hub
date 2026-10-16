import { addDays } from "./task-rules";

/* Disponibilidade, alocação e estimativas (§18–§21). */
export const availabilityExceptionTypes = [
  "VACATION",
  "DAY_OFF",
  "HOLIDAY",
  "TRAINING",
  "ABSENCE",
  "EXTRA_SUPPORT",
  "OTHER",
] as const;
export const allocationTypes = ["PERCENTAGE", "HOURS"] as const;
export const allocationPeriods = ["DAY", "WEEK"] as const;
export const estimateConfidences = ["HIGH", "MEDIUM", "LOW"] as const;

/** Faixas de utilização planejada (§25.5): abaixo de 85% saudável, até 100% atenção, acima sobrecarga. */
export const capacityLevels = ["HEALTHY", "ATTENTION", "OVERLOADED", "NO_CAPACITY"] as const;

/**
 * Inconsistências sinalizadas antes da previsão (§20.5): soma acima da capacidade (CA-011), percentuais
 * acima de 100% no mesmo dia (RN-029, CA-014), alocação sem jornada, pessoa fora do time alocado e
 * contexto inativo.
 */
export const capacityIssueTypes = [
  "OVER_ALLOCATED",
  "PERCENTAGE_OVER_LIMIT",
  "NO_SCHEDULE",
  "NOT_TEAM_MEMBER",
  "INACTIVE_CONTEXT",
] as const;

export type AvailabilityExceptionTypeValue = (typeof availabilityExceptionTypes)[number];
export type AllocationTypeValue = (typeof allocationTypes)[number];
export type AllocationPeriodValue = (typeof allocationPeriods)[number];
export type EstimateConfidenceValue = (typeof estimateConfidences)[number];
export type CapacityLevelValue = (typeof capacityLevels)[number];
export type CapacityIssueTypeValue = (typeof capacityIssueTypes)[number];

/** Período padrão das visões de capacidade, em dias corridos a partir de hoje. */
export const CAPACITY_DEFAULT_DAYS = 14;
/** Horizonte máximo de cálculo (§25.6). */
export const CAPACITY_MAX_DAYS = 184;
/** Utilização a partir da qual a capacidade pede atenção (§25.5). */
export const UTILIZATION_ATTENTION_PERCENT = 85;

/** Diferenças menores que isto são arredondamento, não conflito. */
const EPSILON = 0.005;

/* -------------------------------------------------------------------------- */
/* Calendário                                                                 */
/* -------------------------------------------------------------------------- */

/** Dia da semana de uma data de negócio, de segunda (0) a domingo (6) — a ordem do `weekly_pattern`. */
export function weekdayIndex(isoDate: string): number {
  return (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/** Quantidade de dias corridos entre duas datas, incluindo as pontas. */
export function daysInRange(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

/** Vigência fechada `[from, until]`; `until = null` é aberta. */
export function isInPeriod(date: string, from: string, until: string | null): boolean {
  return from <= date && (until === null || date <= until);
}

export function periodsOverlap(a: { from: string; until: string | null }, b: { from: string; until: string | null }): boolean {
  return (a.until === null || b.from <= a.until) && (b.until === null || a.from <= b.until);
}

const round = (value: number) => Math.round(value * 100) / 100;

/* -------------------------------------------------------------------------- */
/* Capacidade efetiva (§18.3)                                                 */
/* -------------------------------------------------------------------------- */

export type ScheduleRule = {
  validFrom: string;
  validUntil: string | null;
  /** Horas por dia, de segunda a domingo. */
  weeklyPattern: readonly number[];
  focusFactor: number;
};

export type ExceptionRule = {
  startDate: string;
  endDate: string;
  /** Horas indisponíveis por dia; `null` = dia inteiro. */
  unavailableHours: number | null;
};

export function weeklyHours(pattern: readonly number[]): number {
  return round(pattern.reduce((sum, hours) => sum + hours, 0));
}

/**
 * `CE = (HN − HI) × FF` (§18.3). O fator de foco é aplicado depois dos descontos explícitos (RN-028) e
 * a capacidade nunca é negativa (§18.4).
 */
export function effectiveCapacity(nominal: number, unavailable: number, focusFactor: number): number {
  return Math.max(0, nominal - unavailable) * focusFactor;
}

export function scheduleOn<S extends ScheduleRule>(schedules: readonly S[], date: string): S | null {
  return schedules.find((s) => isInPeriod(date, s.validFrom, s.validUntil)) ?? null;
}

export type DayCapacity = {
  date: string;
  /** Há jornada vigente no dia. Sem jornada a capacidade é desconhecida, não zero (§3.4). */
  scheduled: boolean;
  nominal: number;
  unavailable: number;
  effective: number;
};

/**
 * Capacidade de um dia. Exceções sobrepostas são consolidadas (§19.4): um dia inteiro indisponível
 * desconta a jornada uma única vez; ausências parciais somam, limitadas à jornada do dia — nada é
 * descontado duas vezes (§18.4) e a ausência parcial reduz só a parte correspondente.
 */
export function dayCapacity(date: string, schedules: readonly ScheduleRule[], exceptions: readonly ExceptionRule[]): DayCapacity {
  const schedule = scheduleOn(schedules, date);
  if (!schedule) return { date, scheduled: false, nominal: 0, unavailable: 0, effective: 0 };
  const nominal = schedule.weeklyPattern[weekdayIndex(date)] ?? 0;
  const covering = exceptions.filter((e) => e.startDate <= date && date <= e.endDate);
  const unavailable = covering.some((e) => e.unavailableHours === null)
    ? nominal
    : Math.min(nominal, covering.reduce((sum, e) => sum + (e.unavailableHours ?? 0), 0));
  return { date, scheduled: true, nominal, unavailable, effective: effectiveCapacity(nominal, unavailable, schedule.focusFactor) };
}

/* -------------------------------------------------------------------------- */
/* Alocações (§20)                                                            */
/* -------------------------------------------------------------------------- */

export type AllocationRule = {
  id: string;
  type: AllocationTypeValue;
  /** Percentual entre 0 e 1 ou horas por `period`. */
  value: number;
  period: AllocationPeriodValue | null;
  validFrom: string;
  validUntil: string | null;
};

/**
 * Horas de uma alocação em um dia (política de distribuição diária, §56.2):
 * - percentual: `CA = CE × PA` (§25.5) sobre a capacidade efetiva do dia;
 * - horas por dia: o valor em cada dia com jornada;
 * - horas por semana: distribuídas proporcionalmente à jornada nominal de cada dia.
 * Alocações em horas são compromissos fixos: ausências não as reduzem, então a ausência aparece
 * como conflito em vez de sumir silenciosamente.
 */
export function allocationHoursOn(allocation: AllocationRule, day: DayCapacity, schedule: ScheduleRule | null): number {
  if (!schedule || !day.scheduled || !isInPeriod(day.date, allocation.validFrom, allocation.validUntil)) return 0;
  if (allocation.type === "PERCENTAGE") return allocation.value * day.effective;
  if (day.nominal <= 0) return 0;
  if (allocation.period === "DAY") return allocation.value;
  const weekly = weeklyHours(schedule.weeklyPattern);
  return weekly > 0 ? (allocation.value * day.nominal) / weekly : 0;
}

export type CapacityDay = DayCapacity & { allocated: number };

export type CapacitySummary = {
  days: number;
  scheduledDays: number;
  /** Dias com jornada e alguma indisponibilidade. */
  absenceDays: number;
  nominalHours: number;
  unavailableHours: number;
  effectiveHours: number;
  allocatedHours: number;
  freeHours: number;
  overAllocatedHours: number;
  /** Maior soma de alocações percentuais vigentes no mesmo dia, em % (RN-029). */
  peakAllocationPercent: number;
};

export type CapacityComputation = {
  summary: CapacitySummary;
  /** Horas de cada alocação no período. */
  allocationHours: Record<string, number>;
  /** Alocações vigentes em algum dia sem jornada. */
  allocationsWithoutSchedule: string[];
  issues: CapacityIssueTypeValue[];
  daily: CapacityDay[];
};

/**
 * Capacidade de uma pessoa no período `[from, to]`: nominal, indisponível, efetiva, alocada, livre e
 * sobrecarga. É sempre a capacidade global da pessoa — times e projetos recebem só a parcela alocada
 * a eles, então nada é duplicado entre contextos (§18.4, RN-026, CA-021).
 */
export function computeCapacity(input: {
  from: string;
  to: string;
  schedules: readonly ScheduleRule[];
  exceptions: readonly ExceptionRule[];
  allocations: readonly AllocationRule[];
}): CapacityComputation {
  const allocationHours: Record<string, number> = Object.fromEntries(input.allocations.map((a) => [a.id, 0]));
  const withoutSchedule = new Set<string>();
  const daily: CapacityDay[] = [];
  let peakPercentage = 0;

  for (const date of eachDay(input.from, input.to)) {
    const day = dayCapacity(date, input.schedules, input.exceptions);
    const schedule = scheduleOn(input.schedules, date);
    let allocated = 0;
    let percentage = 0;
    for (const allocation of input.allocations) {
      if (!isInPeriod(date, allocation.validFrom, allocation.validUntil)) continue;
      if (!day.scheduled) withoutSchedule.add(allocation.id);
      if (allocation.type === "PERCENTAGE") percentage += allocation.value;
      const hours = allocationHoursOn(allocation, day, schedule);
      allocationHours[allocation.id] = (allocationHours[allocation.id] ?? 0) + hours;
      allocated += hours;
    }
    peakPercentage = Math.max(peakPercentage, percentage);
    daily.push({ ...day, allocated });
  }

  const sum = (pick: (d: CapacityDay) => number) => daily.reduce((total, d) => total + pick(d), 0);
  const effective = sum((d) => d.effective);
  const allocated = sum((d) => d.allocated);
  const summary: CapacitySummary = {
    days: daily.length,
    scheduledDays: daily.filter((d) => d.scheduled).length,
    absenceDays: daily.filter((d) => d.unavailable > 0).length,
    nominalHours: round(sum((d) => d.nominal)),
    unavailableHours: round(sum((d) => d.unavailable)),
    effectiveHours: round(effective),
    allocatedHours: round(allocated),
    freeHours: round(Math.max(0, effective - allocated)),
    overAllocatedHours: round(Math.max(0, allocated - effective)),
    peakAllocationPercent: Math.round(peakPercentage * 1000) / 10,
  };

  const issues: CapacityIssueTypeValue[] = [];
  if (allocated - effective > EPSILON) issues.push("OVER_ALLOCATED");
  if (peakPercentage > 1 + EPSILON / 100) issues.push("PERCENTAGE_OVER_LIMIT");
  if (withoutSchedule.size > 0) issues.push("NO_SCHEDULE");

  return {
    summary,
    allocationHours: Object.fromEntries(Object.entries(allocationHours).map(([id, hours]) => [id, round(hours)])),
    allocationsWithoutSchedule: [...withoutSchedule],
    issues,
    daily: daily.map((d) => ({ ...d, effective: round(d.effective), allocated: round(d.allocated) })),
  };
}

/* -------------------------------------------------------------------------- */
/* Demanda e utilização (§25.5)                                               */
/* -------------------------------------------------------------------------- */

export type DemandItem = { remainingHours: number | null; committedDate: string | null };

export type DemandSummary = {
  openItems: number;
  estimatedItems: number;
  /** Itens sem esforço restante: ficam fora das somas e tornam o resultado incompleto (RN-039). */
  unestimatedItems: number;
  /** Esforço restante com compromisso até o fim do período, inclusive vencidos. */
  dueHours: number;
  /** Esforço restante com compromisso depois do período. */
  laterHours: number;
  /** Esforço restante sem compromisso. */
  undatedHours: number;
  totalHours: number;
};

/**
 * Demanda de itens abertos (entregas concluídas não consomem capacidade, RN-035). Sem estimativa
 * não vira zero: conta como item não estimado (§3.4).
 */
export function summarizeDemand(items: readonly DemandItem[], periodEnd: string): DemandSummary {
  const summary: DemandSummary = {
    openItems: items.length,
    estimatedItems: 0,
    unestimatedItems: 0,
    dueHours: 0,
    laterHours: 0,
    undatedHours: 0,
    totalHours: 0,
  };
  for (const item of items) {
    if (item.remainingHours === null) {
      summary.unestimatedItems += 1;
      continue;
    }
    summary.estimatedItems += 1;
    summary.totalHours += item.remainingHours;
    if (!item.committedDate) summary.undatedHours += item.remainingHours;
    else if (item.committedDate <= periodEnd) summary.dueHours += item.remainingHours;
    else summary.laterHours += item.remainingHours;
  }
  return {
    ...summary,
    dueHours: round(summary.dueHours),
    laterHours: round(summary.laterHours),
    undatedHours: round(summary.undatedHours),
    totalHours: round(summary.totalHours),
  };
}

/** `U = (D / CA) × 100` (§25.5). Com `CA = 0` não há percentual: o sistema sinaliza falta de capacidade. */
export function utilizationPercent(demand: number, capacity: number): number | null {
  if (capacity <= EPSILON) return null;
  return Math.round((demand / capacity) * 1000) / 10;
}

export function capacityLevel(demand: number, capacity: number): CapacityLevelValue {
  const u = utilizationPercent(demand, capacity);
  if (u === null) return "NO_CAPACITY";
  if (u > 100) return "OVERLOADED";
  if (u >= UTILIZATION_ATTENTION_PERCENT) return "ATTENTION";
  return "HEALTHY";
}

/** Período válido para as visões de capacidade: `to ≥ from` e dentro do horizonte máximo (§25.6). */
export function isValidCapacityRange(from: string, to: string): boolean {
  return to >= from && daysInRange(from, to) <= CAPACITY_MAX_DAYS;
}

import { describe, expect, it } from "vitest";
import {
  type AllocationRule,
  capacityLevel,
  computeCapacity,
  dayCapacity,
  effectiveCapacity,
  eachDay,
  isValidCapacityRange,
  periodsOverlap,
  type ScheduleRule,
  summarizeDemand,
  utilizationPercent,
  weekdayIndex,
} from "./capacity-rules";

// 2026-10-19 é segunda-feira.
const MONDAY = "2026-10-19";
const FRIDAY = "2026-10-23";
const SUNDAY = "2026-10-25";
const fullTime: ScheduleRule = { validFrom: "2026-01-01", validUntil: null, weeklyPattern: [8, 8, 8, 8, 8, 0, 0], focusFactor: 0.75 };

const pct = (id: string, value: number, extra: Partial<AllocationRule> = {}): AllocationRule => ({
  id,
  type: "PERCENTAGE",
  value,
  period: null,
  validFrom: "2026-01-01",
  validUntil: null,
  ...extra,
});

describe("calendário", () => {
  it("indexa a semana de segunda (0) a domingo (6)", () => {
    expect(weekdayIndex(MONDAY)).toBe(0);
    expect(weekdayIndex(SUNDAY)).toBe(6);
    expect(eachDay(MONDAY, SUNDAY)).toHaveLength(7);
  });

  it("detecta sobreposição de vigências abertas e fechadas", () => {
    expect(periodsOverlap({ from: "2026-01-01", until: null }, { from: "2026-06-01", until: "2026-06-30" })).toBe(true);
    expect(periodsOverlap({ from: "2026-01-01", until: "2026-05-31" }, { from: "2026-06-01", until: null })).toBe(false);
  });

  it("limita o período ao horizonte máximo (§25.6)", () => {
    expect(isValidCapacityRange(MONDAY, FRIDAY)).toBe(true);
    expect(isValidCapacityRange(FRIDAY, MONDAY)).toBe(false);
    expect(isValidCapacityRange("2026-01-01", "2026-12-31")).toBe(false);
  });
});

describe("capacidade efetiva (§18.3)", () => {
  it("CE = (HN − HI) × FF: 40 h, 8 h indisponíveis, 75% → 24 h", () => {
    expect(effectiveCapacity(40, 8, 0.75)).toBe(24);
  });

  it("nunca é negativa (§18.4)", () => {
    expect(effectiveCapacity(8, 10, 0.75)).toBe(0);
  });

  it("aplica o fator de foco depois dos descontos (RN-028)", () => {
    const week = computeCapacity({
      from: MONDAY,
      to: SUNDAY,
      schedules: [fullTime],
      exceptions: [{ startDate: MONDAY, endDate: MONDAY, unavailableHours: null }],
      allocations: [],
    });
    expect(week.summary).toMatchObject({ nominalHours: 40, unavailableHours: 8, effectiveHours: 24, absenceDays: 1 });
  });

  it("sem jornada a capacidade não é inventada: o dia fica sem jornada (§3.4)", () => {
    const day = dayCapacity(MONDAY, [], []);
    expect(day).toMatchObject({ scheduled: false, effective: 0 });
  });

  it("respeita a jornada diferente por dia e a vigência", () => {
    const partTime: ScheduleRule = { validFrom: "2026-10-21", validUntil: null, weeklyPattern: [4, 4, 4, 4, 4, 0, 0], focusFactor: 1 };
    const before: ScheduleRule = { ...fullTime, validUntil: "2026-10-20", focusFactor: 1 };
    const week = computeCapacity({ from: MONDAY, to: SUNDAY, schedules: [before, partTime], exceptions: [], allocations: [] });
    expect(week.summary.nominalHours).toBe(8 + 8 + 4 + 4 + 4);
  });
});

describe("ausências (§19.4)", () => {
  it("ausência parcial reduz só a parte correspondente", () => {
    const day = dayCapacity(MONDAY, [fullTime], [{ startDate: MONDAY, endDate: MONDAY, unavailableHours: 2 }]);
    expect(day).toMatchObject({ nominal: 8, unavailable: 2, effective: 4.5 });
  });

  it("exceções sobrepostas são consolidadas: nada é descontado duas vezes (§18.4)", () => {
    const day = dayCapacity(
      MONDAY,
      [fullTime],
      [
        { startDate: MONDAY, endDate: FRIDAY, unavailableHours: null }, // férias
        { startDate: MONDAY, endDate: MONDAY, unavailableHours: null }, // feriado no mesmo dia
        { startDate: MONDAY, endDate: MONDAY, unavailableHours: 3 }, // treinamento
      ],
    );
    expect(day.unavailable).toBe(8);
  });

  it("parciais somam, limitadas à jornada do dia", () => {
    const day = dayCapacity(
      MONDAY,
      [fullTime],
      [
        { startDate: MONDAY, endDate: MONDAY, unavailableHours: 5 },
        { startDate: MONDAY, endDate: MONDAY, unavailableHours: 6 },
      ],
    );
    expect(day.unavailable).toBe(8);
  });

  it("ausência em dia sem jornada não desconta nada", () => {
    expect(dayCapacity(SUNDAY, [fullTime], [{ startDate: SUNDAY, endDate: SUNDAY, unavailableHours: null }]).unavailable).toBe(0);
  });
});

describe("alocações (§20)", () => {
  it("distribui a capacidade efetiva entre contextos sem sobra (§20.4)", () => {
    const week = computeCapacity({
      from: MONDAY,
      to: SUNDAY,
      schedules: [fullTime],
      exceptions: [{ startDate: MONDAY, endDate: MONDAY, unavailableHours: null }],
      allocations: [pct("pagamentos", 0.5), pct("auth", 0.3), pct("suporte", 0.2)],
    });
    expect(week.allocationHours).toEqual({ pagamentos: 12, auth: 7.2, suporte: 4.8 });
    expect(week.summary).toMatchObject({ allocatedHours: 24, freeHours: 0, overAllocatedHours: 0, peakAllocationPercent: 100 });
    expect(week.issues).toEqual([]);
  });

  it("percentuais acima de 100% no mesmo dia geram conflito (RN-029, CA-014)", () => {
    const week = computeCapacity({
      from: MONDAY,
      to: SUNDAY,
      schedules: [fullTime],
      exceptions: [],
      allocations: [pct("a", 0.7), pct("b", 0.5)],
    });
    expect(week.summary.peakAllocationPercent).toBe(120);
    expect(week.issues).toEqual(expect.arrayContaining(["PERCENTAGE_OVER_LIMIT", "OVER_ALLOCATED"]));
    expect(week.summary.overAllocatedHours).toBe(6);
  });

  it("vigências que não se cruzam somam 100% sem conflito", () => {
    const week = computeCapacity({
      from: MONDAY,
      to: SUNDAY,
      schedules: [fullTime],
      exceptions: [],
      allocations: [pct("a", 1, { validUntil: "2026-10-21" }), pct("b", 1, { validFrom: "2026-10-22" })],
    });
    expect(week.issues).toEqual([]);
    expect(week.summary.allocatedHours).toBe(30);
  });

  it("horas por semana seguem a jornada; ausências não reduzem o compromisso e geram conflito (CA-011)", () => {
    const support: AllocationRule = { id: "s", type: "HOURS", value: 10, period: "WEEK", validFrom: "2026-01-01", validUntil: null };
    const normal = computeCapacity({ from: MONDAY, to: SUNDAY, schedules: [fullTime], exceptions: [], allocations: [support] });
    expect(normal.allocationHours.s).toBe(10);
    expect(normal.issues).toEqual([]);

    const vacation = computeCapacity({
      from: MONDAY,
      to: SUNDAY,
      schedules: [fullTime],
      exceptions: [{ startDate: MONDAY, endDate: FRIDAY, unavailableHours: null }],
      allocations: [support],
    });
    expect(vacation.summary.effectiveHours).toBe(0);
    expect(vacation.issues).toContain("OVER_ALLOCATED");
  });

  it("horas por dia valem só em dias com jornada", () => {
    const daily: AllocationRule = { id: "d", type: "HOURS", value: 2, period: "DAY", validFrom: "2026-01-01", validUntil: null };
    const week = computeCapacity({ from: MONDAY, to: SUNDAY, schedules: [fullTime], exceptions: [], allocations: [daily] });
    expect(week.allocationHours.d).toBe(10);
  });

  it("alocação em dia sem jornada é sinalizada antes da previsão (§20.5)", () => {
    const week = computeCapacity({ from: MONDAY, to: SUNDAY, schedules: [], exceptions: [], allocations: [pct("a", 0.5)] });
    expect(week.issues).toEqual(["NO_SCHEDULE"]);
    expect(week.allocationsWithoutSchedule).toEqual(["a"]);
  });
});

describe("demanda e utilização (§25.5)", () => {
  it("separa o que vence no período, o que vence depois e o que não tem compromisso", () => {
    const demand = summarizeDemand(
      [
        { remainingHours: 10, committedDate: "2026-10-10" }, // vencido: ainda precisa ser feito
        { remainingHours: 6, committedDate: FRIDAY },
        { remainingHours: 4, committedDate: "2026-12-01" },
        { remainingHours: 3, committedDate: null },
        { remainingHours: null, committedDate: FRIDAY },
      ],
      SUNDAY,
    );
    expect(demand).toEqual({
      openItems: 5,
      estimatedItems: 4,
      unestimatedItems: 1,
      dueHours: 16,
      laterHours: 4,
      undatedHours: 3,
      totalHours: 23,
    });
  });

  it("CA = 0 não vira percentual: sinaliza falta de capacidade", () => {
    expect(utilizationPercent(10, 0)).toBeNull();
    expect(capacityLevel(10, 0)).toBe("NO_CAPACITY");
    expect(capacityLevel(0, 0)).toBe("NO_CAPACITY");
  });

  it("classifica as faixas de utilização", () => {
    expect(utilizationPercent(12, 24)).toBe(50);
    expect(capacityLevel(12, 24)).toBe("HEALTHY");
    expect(capacityLevel(21, 24)).toBe("ATTENTION");
    expect(capacityLevel(30, 24)).toBe("OVERLOADED");
  });
});

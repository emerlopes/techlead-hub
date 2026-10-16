import { periodsOverlap, weekdayIndex } from "./capacity-rules";
import { addDays } from "./task-rules";

/** Limites da duração de sprint gerada, em dias úteis. */
export const SPRINT_LENGTH_MIN = 1;
export const SPRINT_LENGTH_MAX = 60;
/** Teto de sprints geradas por time em um cadastro, para não criar calendários absurdos. */
export const SPRINT_GENERATION_MAX = 52;

export type SprintPeriod = { startDate: string; endDate: string };

/** Segunda a sexta. Feriados e ausências entram pela capacidade, não pelo calendário da sprint. */
export function isBusinessDay(isoDate: string): boolean {
  return weekdayIndex(isoDate) < 5;
}

/** A própria data, se for dia útil; senão, o próximo dia útil. */
export function nextBusinessDay(isoDate: string): string {
  let day = isoDate;
  while (!isBusinessDay(day)) day = addDays(day, 1);
  return day;
}

/** Último dia de um período de `count` dias úteis que começa em `start` (dia útil). */
export function endAfterBusinessDays(start: string, count: number): string {
  let day = nextBusinessDay(start);
  for (let counted = 1; counted < count; counted++) day = nextBusinessDay(addDays(day, 1));
  return day;
}

/**
 * Calendário de sprints consecutivas de `lengthDays` dias úteis, do primeiro dia útil em
 * `startDate` até cobrir `untilDate` (a última pode terminar depois). Períodos que se sobrepõem a
 * sprints já ocupadas pelo time são pulados, sem deslocar a cadência.
 */
export function planSprintCalendar(input: {
  startDate: string;
  untilDate: string;
  lengthDays: number;
  occupied: readonly SprintPeriod[];
  max?: number;
}): { planned: SprintPeriod[]; skipped: SprintPeriod[] } {
  const planned: SprintPeriod[] = [];
  const skipped: SprintPeriod[] = [];
  const max = input.max ?? SPRINT_GENERATION_MAX;
  let cursor = nextBusinessDay(input.startDate);
  while (cursor <= input.untilDate && planned.length + skipped.length < max) {
    const slot = { startDate: cursor, endDate: endAfterBusinessDays(cursor, input.lengthDays) };
    const busy = input.occupied.some((o) =>
      periodsOverlap({ from: slot.startDate, until: slot.endDate }, { from: o.startDate, until: o.endDate }),
    );
    (busy ? skipped : planned).push(slot);
    cursor = nextBusinessDay(addDays(slot.endDate, 1));
  }
  return { planned, skipped };
}

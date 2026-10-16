import { describe, expect, it } from "vitest";
import { endAfterBusinessDays, nextBusinessDay, planSprintCalendar } from "./sprint-calendar";

// 2026-10-16 é sexta-feira.
describe("calendário de sprints em dias úteis", () => {
  it("pula fins de semana", () => {
    expect(nextBusinessDay("2026-10-17")).toBe("2026-10-19");
    expect(nextBusinessDay("2026-10-16")).toBe("2026-10-16");
    expect(endAfterBusinessDays("2026-10-19", 10)).toBe("2026-10-30");
    expect(endAfterBusinessDays("2026-10-16", 1)).toBe("2026-10-16");
  });

  it("gera sprints consecutivas até cobrir o prazo", () => {
    const { planned, skipped } = planSprintCalendar({ startDate: "2026-10-17", untilDate: "2026-11-20", lengthDays: 10, occupied: [] });
    expect(planned).toEqual([
      { startDate: "2026-10-19", endDate: "2026-10-30" },
      { startDate: "2026-11-02", endDate: "2026-11-13" },
      { startDate: "2026-11-16", endDate: "2026-11-27" },
    ]);
    expect(skipped).toEqual([]);
  });

  it("pula períodos ocupados sem deslocar a cadência", () => {
    const { planned, skipped } = planSprintCalendar({
      startDate: "2026-10-19",
      untilDate: "2026-11-13",
      lengthDays: 10,
      occupied: [{ startDate: "2026-10-26", endDate: "2026-11-06" }],
    });
    expect(planned).toEqual([]);
    expect(skipped).toHaveLength(2);
    const free = planSprintCalendar({ startDate: "2026-10-19", untilDate: "2026-11-13", lengthDays: 10, occupied: [{ startDate: "2026-10-01", endDate: "2026-10-16" }] });
    expect(free.planned).toHaveLength(2);
  });

  it("respeita o teto de sprints geradas", () => {
    expect(planSprintCalendar({ startDate: "2026-01-01", untilDate: "2030-12-31", lengthDays: 1, occupied: [], max: 5 }).planned).toHaveLength(5);
  });
});

import { describe, expect, it } from "vitest";
import { createExecutionPlanSchema } from "./planning";
import {
  contextCapacityByDay,
  createsCycle,
  dependencyState,
  planShapeIssues,
  projectionIssues,
  type SimItem,
  type SimPlan,
  simulateExecution,
} from "./planning-rules";

// 2026-10-19 é segunda-feira.
const MON = "2026-10-19";
const TUE = "2026-10-20";
const WED = "2026-10-21";
const THU = "2026-10-22";
const FRI = "2026-10-23";

/** 8 h de contexto por dia útil da semana de referência. */
const weekCapacity = (hours = 8): Record<string, number> => ({ [MON]: hours, [TUE]: hours, [WED]: hours, [THU]: hours, [FRI]: hours });

const item = (id: string, remaining: number | null, extra: Partial<SimItem> = {}): SimItem => ({
  id,
  workItemId: `w-${id}`,
  share: null,
  earliestStart: null,
  closed: false,
  remaining,
  blocking: null,
  constraints: [],
  ...extra,
});

const plan = (items: SimItem[], extra: Partial<SimPlan> = {}): SimPlan => ({
  id: "p1",
  developerId: "ana",
  mode: "SEQUENTIAL",
  maxParallel: 1,
  policy: "SAME_CONTEXT",
  from: MON,
  to: FRI,
  capacity: weekCapacity(),
  items,
  ...extra,
});

const run = (p: SimPlan, today = MON) => {
  const result = simulateExecution([p], today)[p.id];
  if (!result) throw new Error("sem projeção");
  return result;
};

describe("validação da fila (§22.5)", () => {
  it("paralelismo com soma de 100% é válido (CA-013) e acima é rejeitado (CA-014)", () => {
    const items = [
      { workItemId: "a", capacityShare: 0.7 },
      { workItemId: "b", capacityShare: 0.3 },
    ];
    expect(planShapeIssues({ executionMode: "PARALLEL", maxParallelItems: 2, items })).toEqual([]);
    const over = planShapeIssues({ executionMode: "PARALLEL", maxParallelItems: 2, items: [...items.slice(0, 1), { workItemId: "b", capacityShare: 0.4 }] });
    expect(over.map((i) => i.path)).toEqual(["items"]);
    expect(over[0]?.message).toContain("110%");
  });

  it("no híbrido valem as maiores parcelas que podem executar juntas", () => {
    const items = [
      { workItemId: "a", capacityShare: 0.6 },
      { workItemId: "b", capacityShare: 0.4 },
      { workItemId: "c", capacityShare: 0.5 },
    ];
    expect(planShapeIssues({ executionMode: "HYBRID", maxParallelItems: 2, items })).toHaveLength(1);
    expect(planShapeIssues({ executionMode: "HYBRID", maxParallelItems: 1, items })).toEqual([]);
  });

  it("exige parcela no paralelo, um item por vez no sequencial e itens sem repetição", () => {
    expect(planShapeIssues({ executionMode: "PARALLEL", maxParallelItems: 2, items: [{ workItemId: "a" }] })[0]?.path).toBe("items.0.capacityShare");
    expect(planShapeIssues({ executionMode: "SEQUENTIAL", maxParallelItems: 2, items: [] })[0]?.path).toBe("maxParallelItems");
    const dup = planShapeIssues({ executionMode: "SEQUENTIAL", maxParallelItems: 1, items: [{ workItemId: "a" }, { workItemId: "a" }] });
    expect(dup[0]?.path).toBe("items.1.workItemId");
  });

  it("o contrato do §37 vale e ordena a fila pela posição explícita", () => {
    const parsed = createExecutionPlanSchema.parse({
      developerId: "0b8b5d2a-5b52-4b2c-9a0e-6d1d2a3b4c5d",
      period: { startDate: MON, endDate: "2026-10-30" },
      executionMode: "HYBRID",
      maxParallelItems: 2,
      items: [
        { workItemId: "1b8b5d2a-5b52-4b2c-9a0e-6d1d2a3b4c5d", position: 2, capacityShare: 0.3 },
        { workItemId: "2b8b5d2a-5b52-4b2c-9a0e-6d1d2a3b4c5d", position: 1, capacityShare: 0.7 },
      ],
    });
    expect(parsed.items.map((i) => i.capacityShare)).toEqual([0.7, 0.3]);
    expect(parsed).toMatchObject({ redistributionPolicy: "SAME_CONTEXT", status: "ACTIVE" });
    // Sem modo: sequencial é o padrão (§22.5), com um item por vez.
    const sequential = createExecutionPlanSchema.parse({ developerId: parsed.developerId, period: { startDate: MON, endDate: FRI } });
    expect(sequential).toMatchObject({ executionMode: "SEQUENTIAL", maxParallelItems: 1 });
  });
});

describe("dependências (§24)", () => {
  it("rejeita ciclos diretos e indiretos e a dependência de si mesma (CA-017)", () => {
    const edges = [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ];
    expect(createsCycle(edges, "c", "a")).toBe(true);
    expect(createsCycle(edges, "a", "a")).toBe(true);
    expect(createsCycle(edges, "a", "c")).toBe(false);
  });

  it("só Finish-to-Start e externa entram no cálculo (§24.4)", () => {
    const base = { status: "OPEN" as const, expectedReleaseDate: null, predecessorClosed: false };
    expect(dependencyState({ ...base, type: "START_TO_START" })).toBe("NOT_CALCULATED");
    expect(dependencyState({ ...base, type: "FINISH_TO_START" })).toBe("PENDING");
    expect(dependencyState({ ...base, type: "FINISH_TO_START", predecessorClosed: true })).toBe("RELEASED");
    expect(dependencyState({ ...base, type: "EXTERNAL" })).toBe("UNKNOWN");
    expect(dependencyState({ ...base, type: "EXTERNAL", expectedReleaseDate: WED })).toBe("PENDING");
    expect(dependencyState({ ...base, type: "EXTERNAL", status: "RELEASED" })).toBe("RELEASED");
  });
});

describe("capacidade do contexto", () => {
  it("usa só as alocações do contexto, com a mesma distribuição diária da capacidade", () => {
    const byDay = contextCapacityByDay({
      from: MON,
      to: TUE,
      schedules: [{ validFrom: "2026-01-01", validUntil: null, weeklyPattern: [8, 8, 8, 8, 8, 0, 0], focusFactor: 0.75 }],
      exceptions: [{ startDate: TUE, endDate: TUE, unavailableHours: null }],
      allocations: [{ id: "a", type: "PERCENTAGE", value: 0.5, period: null, validFrom: "2026-01-01", validUntil: null }],
    });
    expect(byDay).toEqual({ [MON]: 3, [TUE]: 0 });
  });
});

describe("projeção da execução (§22)", () => {
  it("sequencial: o primeiro elegível recebe tudo e a conclusão libera a capacidade no mesmo dia (CA-012)", () => {
    const p = run(plan([item("a", 12), item("b", 10)]));
    expect(p.items.a).toMatchObject({ state: "COMPLETES", startDate: MON, finishDate: TUE, plannedHours: 12 });
    expect(p.items.b).toMatchObject({ state: "COMPLETES", startDate: TUE, finishDate: WED, plannedHours: 10 });
    expect(p.items.b?.hoursByDay).toEqual([0, 4, 6, 0, 0]);
    expect(p).toMatchObject({ capacityHours: 40, plannedHours: 22, idleHours: 18, complete: true });
  });

  it("entregas concluídas não consomem capacidade (RN-035)", () => {
    const p = run(plan([item("a", 5, { closed: true }), item("b", 8)]));
    expect(p.items.a?.state).toBe("DONE");
    expect(p.items.b).toMatchObject({ startDate: MON, finishDate: MON });
  });

  it("paralelo: cada item com a sua parcela; quem termina passa a sobra conforme a política", () => {
    const items = [item("a", 4, { share: 0.5 }), item("b", 20, { share: 0.5 })];
    const none = run(plan(items, { mode: "PARALLEL", maxParallel: 2, policy: "NONE" }));
    expect(none.items.a).toMatchObject({ finishDate: MON, plannedHours: 4 });
    expect(none.items.b?.hoursByDay).toEqual([4, 4, 4, 4, 4]);
    expect(none.idleHours).toBe(16);

    const same = run(plan(items, { mode: "PARALLEL", maxParallel: 2, policy: "SAME_CONTEXT" }));
    expect(same.items.b?.hoursByDay).toEqual([4, 8, 8, 0, 0]);
    expect(same.items.b?.redistributedHours).toBe(8);
  });

  it("híbrido: até N itens na ordem da fila, dividindo o que não tem parcela", () => {
    const p = run(plan([item("a", 8), item("b", 8), item("c", 8)], { mode: "HYBRID", maxParallel: 2 }));
    expect(p.items.a?.hoursByDay.slice(0, 2)).toEqual([4, 4]);
    expect(p.items.c).toMatchObject({ startDate: WED, finishDate: WED });
  });

  it("bloqueio total não consome capacidade; parcial usa só o residual (§22.5)", () => {
    const blocked = run(plan([item("a", 8, { blocking: "FULL" }), item("b", 8)]));
    expect(blocked.items.a?.state).toBe("BLOCKED");
    expect(blocked.items.b).toMatchObject({ startDate: MON, finishDate: MON });
    expect(blocked.complete).toBe(false);

    const partial = run(plan([item("a", 8, { blocking: "PARTIAL" }), item("b", 8)], { policy: "NONE" }));
    expect(partial.items.a?.hoursByDay.slice(0, 2)).toEqual([4, 4]);
    expect(partial.items.b?.startDate).toBe(WED);
    // Com SAME_CONTEXT o residual ocioso vai para o próximo elegível.
    const shared = run(plan([item("a", 8, { blocking: "PARTIAL" }), item("b", 8)]));
    expect(shared.items.b?.hoursByDay.slice(0, 2)).toEqual([4, 4]);
  });

  it("Finish-to-Start é respeitado mesmo fora da ordem da fila (CA-016)", () => {
    const succ = item("a", 8, { constraints: [{ kind: "ITEM", workItemId: "w-b" }] });
    const p = run(plan([succ, item("b", 12)]));
    expect(p.items.b).toMatchObject({ startDate: MON, finishDate: TUE });
    expect(p.items.a).toMatchObject({ startDate: WED, finishDate: WED });
    expect(projectionIssues(plan([succ, item("b", 12)]), p).map((i) => i.type)).toContain("DEPENDENCY_ORDER");
  });

  it("dependência sem previsão não recebe data arbitrária (CA-018); externa com data é respeitada", () => {
    const unknown = run(plan([item("a", 8, { constraints: [{ kind: "UNKNOWN" }] })]));
    expect(unknown.items.a).toMatchObject({ state: "WAITING_DEPENDENCY", startDate: null, finishDate: null });
    expect(unknown.complete).toBe(false);
    const dated = run(plan([item("a", 8, { constraints: [{ kind: "DATE", date: THU }] })]));
    expect(dated.items.a).toMatchObject({ startDate: THU, finishDate: THU });
  });

  it("sem estimativa ocupa a vaga e torna o resto da fila indeterminado (§3.4)", () => {
    const p = run(plan([item("a", null), item("b", 8)]));
    expect(p.items.a?.state).toBe("NO_ESTIMATE");
    expect(p.items.b?.state).toBe("INDETERMINATE");
    expect(p.complete).toBe(false);
  });

  it("início mais cedo e período: o passado não é simulado e o que não cabe fica em andamento", () => {
    const p = run(plan([item("a", 30, { earliestStart: TUE })]), WED);
    expect(p.days).toEqual([WED, THU, FRI]);
    expect(p.items.a).toMatchObject({ state: "IN_PROGRESS", startDate: WED, remainingAtEnd: 6 });
    expect(projectionIssues(plan([item("a", 30)]), p).map((i) => i.type)).toEqual(["UNFINISHED_IN_PERIOD"]);
  });

  it("CROSS_CONTEXT cede a sobra só a planos da mesma pessoa que também autorizaram (§23.3)", () => {
    const giver = plan([item("a", 4)], { id: "p1", policy: "CROSS_CONTEXT" });
    const taker = plan([item("b", 22)], { id: "p2", policy: "CROSS_CONTEXT", capacity: weekCapacity(2) });
    const result = simulateExecution([giver, taker], MON);
    // Seg: sobram 4 h; ter: 8 h; qua: 4 h bastam para concluir.
    expect(result.p1).toMatchObject({ donatedHours: 16, idleHours: 20 });
    expect(result.p2?.items.b).toMatchObject({ finishDate: WED, redistributedHours: 16 });
    expect(result.p2?.receivedHours).toBe(16);

    const sameOnly = simulateExecution([{ ...giver, policy: "SAME_CONTEXT" }, taker], MON);
    expect(sameOnly.p1?.donatedHours).toBe(0);
    const otherPerson = simulateExecution([giver, { ...taker, developerId: "bia" }], MON);
    expect(otherPerson.p2?.receivedHours).toBe(0);
  });

  it("sem capacidade no contexto o plano é sinalizado", () => {
    const p = plan([item("a", 8)], { capacity: {} });
    expect(projectionIssues(p, run(p)).map((i) => i.type)).toContain("NO_CAPACITY");
  });
});

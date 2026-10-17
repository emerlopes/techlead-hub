import {
  type AllocationRule,
  allocationHoursOn,
  dayCapacity,
  eachDay,
  type ExceptionRule,
  scheduleOn,
  type ScheduleRule,
} from "./capacity-rules";

/* Planejamento híbrido de execução (§22), redistribuição (§23) e dependências (§24). */
export const executionModes = ["SEQUENTIAL", "PARALLEL", "HYBRID"] as const;
export const redistributionPolicies = ["NONE", "SAME_CONTEXT", "CROSS_CONTEXT"] as const;
export const executionPlanStatuses = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export const dependencyTypes = ["FINISH_TO_START", "START_TO_START", "FINISH_TO_FINISH", "EXTERNAL", "INFORMATIONAL"] as const;
/** Situação registrada de uma dependência externa; as internas derivam do predecessor. */
export const dependencyStatuses = ["OPEN", "RELEASED"] as const;
/**
 * Situação derivada de uma dependência no cálculo: liberada, pendente com liberação conhecida ou
 * possível, sem previsão (CA-018) ou só registrada — tipos ainda sem cálculo (§24.4).
 */
export const dependencyStates = ["RELEASED", "PENDING", "UNKNOWN", "NOT_CALCULATED"] as const;

/** Como cada item da fila se comporta na projeção do plano. */
export const planItemStates = [
  "DONE",
  "COMPLETES",
  "IN_PROGRESS",
  "NOT_STARTED",
  "WAITING_DEPENDENCY",
  "BLOCKED",
  "NO_ESTIMATE",
  "INDETERMINATE",
] as const;

/** Restrições e lacunas sinalizadas no plano — o Tech Lead decide o que fazer (§3.5). */
export const planIssueTypes = [
  "NO_CAPACITY",
  "CAPACITY_CONFLICT",
  "NO_ESTIMATE",
  "BLOCKED",
  "DEPENDENCY_UNKNOWN",
  "DEPENDENCY_ORDER",
  "ASSIGNEE_MISMATCH",
  "UNFINISHED_IN_PERIOD",
] as const;

export type ExecutionModeValue = (typeof executionModes)[number];
export type RedistributionPolicyValue = (typeof redistributionPolicies)[number];
export type ExecutionPlanStatusValue = (typeof executionPlanStatuses)[number];
export type DependencyTypeValue = (typeof dependencyTypes)[number];
export type DependencyStatusValue = (typeof dependencyStatuses)[number];
export type DependencyStateValue = (typeof dependencyStates)[number];
export type PlanItemStateValue = (typeof planItemStates)[number];
export type PlanIssueTypeValue = (typeof planIssueTypes)[number];

/** O modo sequencial é o padrão (§22.5). */
export const DEFAULT_EXECUTION_MODE: ExecutionModeValue = "SEQUENTIAL";
/** Política inicial recomendada (§23.4). */
export const DEFAULT_REDISTRIBUTION_POLICY: RedistributionPolicyValue = "SAME_CONTEXT";
/** Paralelismo sugerido ao escolher o modo híbrido (§37). */
export const DEFAULT_PARALLEL_ITEMS = 2;
/** Limite configurável de simultaneidade (§22.5, §56.3). */
export const MAX_PARALLEL_LIMIT = 10;
/** Itens por plano. */
export const PLAN_ITEMS_LIMIT = 50;
/**
 * Bloqueio parcial permite trabalho residual (§22.5): o item usa esta fração da parcela dele; o resto
 * fica ocioso e pode ser redistribuído. Valor provisório até a validação do §56.3.
 */
export const PARTIAL_BLOCK_FACTOR = 0.5;

/** Tipos que formam o grafo de agendamento: ciclos são rejeitados (§35.7, CA-017). */
export const SCHEDULING_DEPENDENCY_TYPES: readonly DependencyTypeValue[] = ["FINISH_TO_START", "START_TO_START", "FINISH_TO_FINISH"];
/** Tipos que o cálculo já respeita (§24.4); os demais são só registrados. */
export const CALCULATED_DEPENDENCY_TYPES: readonly DependencyTypeValue[] = ["FINISH_TO_START", "EXTERNAL"];

const EPSILON = 0.005;
const round = (value: number) => Math.round(value * 100) / 100;

/* -------------------------------------------------------------------------- */
/* Validação da fila (§22.5, CA-013, CA-014)                                  */
/* -------------------------------------------------------------------------- */

export type PlanShape = {
  executionMode: ExecutionModeValue;
  maxParallelItems: number;
  items: readonly { workItemId: string; capacityShare?: number | null }[];
};

export type PlanShapeIssue = { message: string; path: string };

const percent = (fraction: number) => `${Math.round(fraction * 1000) / 10}%`.replace(".", ",");

/**
 * Regras que impedem salvar o plano. A soma das parcelas simultâneas não passa de 100% do contexto
 * (§22.5): exatamente 100% é válido (CA-013), acima é rejeitado (CA-014). No modo paralelo todos os
 * itens executam juntos; no híbrido, as maiores parcelas que podem coincidir são as que contam.
 */
export function planShapeIssues(plan: PlanShape): PlanShapeIssue[] {
  const issues: PlanShapeIssue[] = [];
  const { executionMode: mode, maxParallelItems: limit, items } = plan;
  if (mode === "SEQUENTIAL" && limit !== 1) {
    issues.push({ path: "maxParallelItems", message: "No modo sequencial só um item executa por vez." });
  }
  if (limit < 1 || limit > MAX_PARALLEL_LIMIT) {
    issues.push({ path: "maxParallelItems", message: `Use de 1 a ${MAX_PARALLEL_LIMIT} itens simultâneos.` });
  }
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.workItemId)) issues.push({ path: `items.${index}.workItemId`, message: "O item aparece mais de uma vez na fila." });
    seen.add(item.workItemId);
  });
  if (mode === "SEQUENTIAL") return issues;

  if (mode === "PARALLEL") {
    if (items.length > limit) {
      issues.push({ path: "items", message: `No modo paralelo todos os itens executam juntos: no máximo ${limit}.` });
    }
    items.forEach((item, index) => {
      if (item.capacityShare == null) {
        issues.push({ path: `items.${index}.capacityShare`, message: "No modo paralelo cada item tem a sua parcela." });
      }
    });
    const total = items.reduce((sum, item) => sum + (item.capacityShare ?? 0), 0);
    if (total > 1 + EPSILON / 100) {
      issues.push({ path: "items", message: `As parcelas somam ${percent(total)}: o máximo é 100% do contexto (CA-014).` });
    }
    return issues;
  }

  const largest = items
    .map((item) => item.capacityShare ?? 0)
    .sort((a, b) => b - a)
    .slice(0, limit)
    .reduce((sum, share) => sum + share, 0);
  if (largest > 1 + EPSILON / 100) {
    issues.push({
      path: "items",
      message: `Até ${limit} itens executam juntos e as maiores parcelas somam ${percent(largest)}: o máximo é 100% do contexto (CA-014).`,
    });
  }
  return issues;
}

/* -------------------------------------------------------------------------- */
/* Dependências (§24)                                                         */
/* -------------------------------------------------------------------------- */

/** Incluir `from → to` cria ciclo quando `from` já é alcançável a partir de `to` (CA-017). */
export function createsCycle(edges: readonly { from: string; to: string }[], from: string, to: string): boolean {
  if (from === to) return true;
  const next = new Map<string, string[]>();
  for (const edge of edges) next.set(edge.from, [...(next.get(edge.from) ?? []), edge.to]);
  const stack = [to];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const node = stack.pop() as string;
    if (node === from) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    stack.push(...(next.get(node) ?? []));
  }
  return false;
}

export function dependencyState(dep: {
  type: DependencyTypeValue;
  status: DependencyStatusValue;
  expectedReleaseDate: string | null;
  /** Predecessor encerrado (concluído ou cancelado). */
  predecessorClosed: boolean | null;
}): DependencyStateValue {
  if (!CALCULATED_DEPENDENCY_TYPES.includes(dep.type)) return "NOT_CALCULATED";
  if (dep.type === "EXTERNAL") {
    if (dep.status === "RELEASED") return "RELEASED";
    return dep.expectedReleaseDate ? "PENDING" : "UNKNOWN";
  }
  return dep.predecessorClosed ? "RELEASED" : "PENDING";
}

/* -------------------------------------------------------------------------- */
/* Capacidade do contexto do plano (§20, §22.5)                               */
/* -------------------------------------------------------------------------- */

/**
 * Horas por dia das alocações que alimentam o contexto do plano. Usa a mesma distribuição diária da
 * capacidade (§56.2), então a pessoa nunca ganha horas que não estão alocadas (RN-026).
 */
export function contextCapacityByDay(input: {
  from: string;
  to: string;
  schedules: readonly ScheduleRule[];
  exceptions: readonly ExceptionRule[];
  allocations: readonly AllocationRule[];
}): Record<string, number> {
  const result: Record<string, number> = {};
  if (input.to < input.from) return result;
  for (const date of eachDay(input.from, input.to)) {
    const day = dayCapacity(date, input.schedules, input.exceptions);
    const schedule = scheduleOn(input.schedules, date);
    result[date] = input.allocations.reduce((sum, allocation) => sum + allocationHoursOn(allocation, day, schedule), 0);
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/* Projeção da execução (§22, §23)                                            */
/* -------------------------------------------------------------------------- */

/**
 * Restrição de início já resolvida pela API:
 * - `ITEM`: Finish-to-Start com predecessor aberto que está em algum plano simulado;
 * - `DATE`: dependência externa com liberação prevista;
 * - `UNKNOWN`: sem previsão confiável — o item fica indeterminado em vez de receber data (CA-018).
 */
export type PlanConstraint = { kind: "ITEM"; workItemId: string } | { kind: "DATE"; date: string } | { kind: "UNKNOWN" };

export type SimItem = {
  id: string;
  workItemId: string;
  /** Parcela da capacidade do contexto (0–1); vazia = divide o que sobra entre os itens sem parcela. */
  share: number | null;
  earliestStart: string | null;
  /** Item concluído ou cancelado: não consome capacidade (RN-035). */
  closed: boolean;
  /** Esforço restante corrente; `null` = sem estimativa (§3.4). */
  remaining: number | null;
  /** Impedimento aberto (§16.4). Total não consome capacidade; parcial permite trabalho residual. */
  blocking: "FULL" | "PARTIAL" | null;
  constraints: readonly PlanConstraint[];
};

export type SimPlan = {
  id: string;
  /** Pessoa do plano: a redistribuição entre contextos só acontece dentro da mesma pessoa. */
  developerId: string;
  mode: ExecutionModeValue;
  maxParallel: number;
  policy: RedistributionPolicyValue;
  from: string;
  to: string;
  /** Horas do contexto por dia (`contextCapacityByDay`). */
  capacity: Readonly<Record<string, number>>;
  /** Na ordem explícita da fila (§22.5). */
  items: readonly SimItem[];
  /** Rascunho: projetado, mas fora da redistribuição entre contextos. */
  isolated?: boolean;
};

export type ItemProjection = {
  state: PlanItemStateValue;
  startDate: string | null;
  finishDate: string | null;
  /** Horas que o item consome no período projetado. */
  plannedHours: number;
  /** Parte das horas que veio de capacidade ociosa redistribuída (§23). */
  redistributedHours: number;
  remainingAtEnd: number | null;
  /** Alinhado a `PlanProjection.days`. */
  hoursByDay: number[];
};

export type PlanProjection = {
  /** De hoje (ou do início do plano) até o fim: o passado não é simulado. */
  days: string[];
  capacityByDay: number[];
  usedByDay: number[];
  capacityHours: number;
  plannedHours: number;
  idleHours: number;
  /** Horas recebidas de outros contextos da mesma pessoa (CROSS_CONTEXT). */
  receivedHours: number;
  /** Horas cedidas a outros contextos da mesma pessoa (CROSS_CONTEXT). */
  donatedHours: number;
  /** Sem itens indeterminados, bloqueados ou à espera de dependência sem previsão (RN-039). */
  complete: boolean;
  items: Record<string, ItemProjection>;
};

type ItemState = {
  item: SimItem;
  plan: SimPlan;
  remaining: number | null;
  start: string | null;
  finish: string | null;
  planned: number;
  redistributed: number;
  byDay: Map<string, number>;
};

type PlanState = { plan: SimPlan; items: ItemState[]; idle: Map<string, number>; received: number; donated: number };

/**
 * Projeta, dia a dia, como a capacidade de cada contexto é consumida pela fila (§22):
 * - sequencial: o primeiro item elegível recebe toda a capacidade; quando conclui, o próximo assume a
 *   sobra do mesmo dia (CA-012);
 * - paralelo: todos os itens executam juntos, cada um com a sua parcela;
 * - híbrido: até `maxParallel` itens elegíveis na ordem da fila, com parcela explícita ou divisão igual
 *   do que sobra.
 * Itens concluídos, bloqueados totalmente, antes do início mais cedo ou à espera de dependência não
 * consomem capacidade (§22.5, CA-016). A sobra segue a política (§23): `NONE` fica livre;
 * `SAME_CONTEXT` vai para outros itens elegíveis da fila; `CROSS_CONTEXT` também pode ir para outros
 * planos da mesma pessoa que autorizaram a troca.
 */
export function simulateExecution(plans: readonly SimPlan[], today: string): Record<string, PlanProjection> {
  const states: PlanState[] = plans.map((plan) => {
    const state: PlanState = { plan, items: [], idle: new Map(), received: 0, donated: 0 };
    state.items = plan.items.map((item) => ({
      item,
      plan,
      remaining: item.remaining,
      start: null,
      finish: null,
      planned: 0,
      redistributed: 0,
      byDay: new Map(),
    }));
    return state;
  });

  // Predecessores pelo item externo: o primeiro plano da lista (os ativos vêm antes dos rascunhos).
  const byWorkItem = new Map<string, ItemState>();
  for (const plan of states) for (const st of plan.items) if (!byWorkItem.has(st.item.workItemId)) byWorkItem.set(st.item.workItemId, st);

  const startOf = (plan: SimPlan) => (plan.from > today ? plan.from : today);
  const active = (plan: SimPlan, date: string) => startOf(plan) <= date && date <= plan.to;
  const constraintsMet = (st: ItemState, date: string) =>
    st.item.constraints.every((c) => {
      if (c.kind === "UNKNOWN") return false;
      if (c.kind === "DATE") return c.date <= date;
      const predecessor = byWorkItem.get(c.workItemId);
      return predecessor !== undefined && (predecessor.item.closed || (predecessor.finish !== null && predecessor.finish < date));
    });
  const eligible = (st: ItemState, date: string) =>
    !st.item.closed &&
    st.finish === null &&
    st.item.blocking !== "FULL" &&
    (st.item.earliestStart === null || st.item.earliestStart <= date) &&
    constraintsMet(st, date);
  const consume = (st: ItemState, date: string, hours: number) => {
    st.start ??= date;
    if (st.remaining === null || hours <= 0) return;
    st.remaining -= hours;
    st.planned += hours;
    st.byDay.set(date, (st.byDay.get(date) ?? 0) + hours);
    if (st.remaining <= EPSILON) {
      st.remaining = 0;
      st.finish = date;
    }
  };
  /** Quem pode receber sobra: elegível, estimado e sem bloqueio parcial (que já usa só o residual). */
  const canReceive = (st: ItemState, date: string) =>
    eligible(st, date) && st.remaining !== null && st.remaining > EPSILON && st.item.blocking !== "PARTIAL";

  const first = states.reduce((min, s) => (startOf(s.plan) < min ? startOf(s.plan) : min), "9999-12-31");
  const last = states.reduce((max, s) => (s.plan.to > max ? s.plan.to : max), "0000-01-01");
  const allDays = first <= last ? eachDay(first, last) : [];

  for (const date of allDays) {
    for (const ps of states) {
      if (!active(ps.plan, date)) continue;
      ps.idle.set(date, runDay(ps, date));
    }
    shareAcrossContexts(states, date);
  }

  function runDay(ps: PlanState, date: string): number {
    const { plan } = ps;
    const capacity = plan.capacity[date] ?? 0;
    const slots = plan.mode === "SEQUENTIAL" ? 1 : plan.mode === "PARALLEL" ? plan.items.length : plan.maxParallel;
    const candidates = ps.items.filter((st) => eligible(st, date));
    let next = Math.min(slots, candidates.length);
    const running = candidates.slice(0, next);
    const shares = sharesFor(plan.mode, running.map((st) => st.item.share));
    let idle = capacity * Math.max(0, 1 - shares.reduce((sum, s) => sum + s, 0));
    let round = running.map((st, index) => ({ st, allotment: capacity * (shares[index] ?? 0) }));

    while (round.length > 0) {
      const following: typeof round = [];
      for (const { st, allotment } of round) {
        if (allotment <= EPSILON) continue;
        if (st.remaining === null) {
          // Sem estimativa: ocupa a vaga sem horas conhecidas (§3.4).
          st.start ??= date;
          continue;
        }
        const usable = st.item.blocking === "PARTIAL" ? allotment * PARTIAL_BLOCK_FACTOR : allotment;
        const used = Math.min(st.remaining, usable);
        consume(st, date, used);
        idle += allotment - usable;
        if (st.finish === null) continue;
        // Conclusão libera a capacidade para o próximo da fila no mesmo dia (CA-012).
        const freed = usable - used;
        while (next < candidates.length && !eligible(candidates[next] as ItemState, date)) next += 1;
        const successor = candidates[next];
        if (successor) {
          next += 1;
          following.push({ st: successor, allotment: freed });
        } else {
          idle += freed;
        }
      }
      round = following;
    }

    if (plan.policy !== "NONE") {
      for (const st of ps.items) {
        if (idle <= EPSILON) break;
        if (!canReceive(st, date)) continue;
        const given = Math.min(idle, st.remaining as number);
        consume(st, date, given);
        st.redistributed += given;
        idle -= given;
      }
    }
    return Math.max(0, idle);
  }

  /** CROSS_CONTEXT: sobra de um plano vai para outro da mesma pessoa, só entre planos que autorizaram. */
  function shareAcrossContexts(all: PlanState[], date: string) {
    const crossing = all.filter((ps) => ps.plan.policy === "CROSS_CONTEXT" && !ps.plan.isolated && active(ps.plan, date));
    for (const receiver of crossing) {
      for (const st of receiver.items) {
        if (!canReceive(st, date)) continue;
        for (const donor of crossing) {
          if (donor === receiver || donor.plan.developerId !== receiver.plan.developerId) continue;
          const available = donor.idle.get(date) ?? 0;
          if (available <= EPSILON || st.remaining === null || st.remaining <= EPSILON) continue;
          const given = Math.min(available, st.remaining);
          consume(st, date, given);
          st.redistributed += given;
          donor.idle.set(date, available - given);
          donor.donated += given;
          receiver.received += given;
        }
      }
    }
  }

  const result: Record<string, PlanProjection> = {};
  for (const ps of states) {
    const { plan } = ps;
    const from = startOf(plan);
    const days = from <= plan.to ? eachDay(from, plan.to) : [];
    const items: Record<string, ItemProjection> = {};
    let slotHeldByUnknown = false;
    for (const st of ps.items) {
      const state = finalState(st, plan.to, slotHeldByUnknown);
      if (st.remaining === null && st.start !== null) slotHeldByUnknown = true;
      items[st.item.id] = {
        state,
        startDate: st.start,
        finishDate: st.finish,
        plannedHours: round(st.planned),
        redistributedHours: round(st.redistributed),
        remainingAtEnd: st.remaining === null || st.item.closed ? (st.item.closed ? 0 : null) : round(st.remaining),
        hoursByDay: days.map((d) => round(st.byDay.get(d) ?? 0)),
      };
    }
    const capacityByDay = days.map((d) => round(plan.capacity[d] ?? 0));
    const usedByDay = days.map((d) => round(ps.items.reduce((sum, st) => sum + (st.byDay.get(d) ?? 0), 0)));
    result[plan.id] = {
      days,
      capacityByDay,
      usedByDay,
      capacityHours: round(capacityByDay.reduce((s, h) => s + h, 0)),
      plannedHours: round(usedByDay.reduce((s, h) => s + h, 0)),
      idleHours: round(days.reduce((s, d) => s + (ps.idle.get(d) ?? 0), 0)),
      receivedHours: round(ps.received),
      donatedHours: round(ps.donated),
      complete: Object.values(items).every((i) => !INCOMPLETE_STATES.includes(i.state)),
      items,
    };
  }
  return result;

  function finalState(st: ItemState, end: string, behindUnknown: boolean): PlanItemStateValue {
    if (st.item.closed) return "DONE";
    if (st.finish !== null) return "COMPLETES";
    if (st.remaining === null) return "NO_ESTIMATE";
    if (st.item.blocking === "FULL") return "BLOCKED";
    if (!constraintsMet(st, end)) return "WAITING_DEPENDENCY";
    if (st.start !== null) return "IN_PROGRESS";
    return behindUnknown ? "INDETERMINATE" : "NOT_STARTED";
  }
}

const INCOMPLETE_STATES: readonly PlanItemStateValue[] = ["NO_ESTIMATE", "INDETERMINATE", "BLOCKED", "WAITING_DEPENDENCY"];

/**
 * Parcelas dos itens que executam juntos: sequencial leva 100%; parcelas explícitas valem como
 * informadas; os itens sem parcela dividem igualmente o que sobra.
 */
function sharesFor(mode: ExecutionModeValue, shares: readonly (number | null)[]): number[] {
  if (shares.length === 0) return [];
  if (mode === "SEQUENTIAL") return [1];
  const explicit = shares.reduce<number>((sum, s) => sum + (s ?? 0), 0);
  const unshared = shares.filter((s) => s === null).length;
  const each = unshared > 0 ? Math.max(0, 1 - explicit) / unshared : 0;
  return shares.map((s) => s ?? each);
}

/* -------------------------------------------------------------------------- */
/* Sinalizações do plano                                                      */
/* -------------------------------------------------------------------------- */

export type PlanIssueFinding = { type: PlanIssueTypeValue; itemIds: string[] };

/**
 * Sinalizações deriváveis da fila e da projeção. A API acrescenta as que dependem de dados de fora
 * (conflito de alocação e responsável diferente).
 */
export function projectionIssues(plan: SimPlan, projection: PlanProjection): PlanIssueFinding[] {
  const issues: PlanIssueFinding[] = [];
  const open = plan.items.filter((i) => !i.closed);
  const withState = (...states: PlanItemStateValue[]) =>
    plan.items.filter((i) => states.includes(projection.items[i.id]?.state ?? "DONE")).map((i) => i.id);

  if (open.length > 0 && projection.days.length > 0 && projection.capacityHours <= EPSILON && projection.receivedHours <= EPSILON) {
    issues.push({ type: "NO_CAPACITY", itemIds: [] });
  }
  const push = (type: PlanIssueTypeValue, itemIds: string[]) => itemIds.length > 0 && issues.push({ type, itemIds });
  push("NO_ESTIMATE", withState("NO_ESTIMATE"));
  push("BLOCKED", withState("BLOCKED"));
  push(
    "DEPENDENCY_UNKNOWN",
    open.filter((i) => i.constraints.some((c) => c.kind === "UNKNOWN")).map((i) => i.id),
  );
  const position = new Map(plan.items.map((i, index) => [i.workItemId, index]));
  push(
    "DEPENDENCY_ORDER",
    plan.items
      .filter((i, index) => !i.closed && i.constraints.some((c) => c.kind === "ITEM" && (position.get(c.workItemId) ?? -1) > index))
      .map((i) => i.id),
  );
  push("UNFINISHED_IN_PERIOD", withState("IN_PROGRESS", "NOT_STARTED"));
  return issues;
}

import { addDays } from "./task-rules";

/* Situações compartilhadas pelas regras de entrega (§13.4, §14.4, §15.3, §16). */
export const healthStatuses = ["ON_TRACK", "AT_RISK", "DELAYED", "BLOCKED", "UNKNOWN"] as const;
export const executionStatuses = ["NOT_STARTED", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"] as const;
export const refinementStatuses = ["NEEDS_REFINEMENT", "ANALYZING", "WAITING_INFORMATION", "READY", "CANCELLED"] as const;
export const sprintStatuses = ["PLANNED", "ACTIVE", "CLOSED", "CANCELLED"] as const;
export const blockingLevels = ["FULL", "PARTIAL"] as const;
export const riskSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export type HealthStatusValue = (typeof healthStatuses)[number];
export type ExecutionStatusValue = (typeof executionStatuses)[number];
export type RefinementStatusValue = (typeof refinementStatuses)[number];
export type SprintStatusValue = (typeof sprintStatuses)[number];
export type BlockingLevelValue = (typeof blockingLevels)[number];
export type RiskSeverityValue = (typeof riskSeverities)[number];

/** Acompanhamento sem verificação há mais que isto é sinalizado como desatualizado (§14.5, §5.4). */
export const TRACKING_STALE_DAYS = 3;

/** Sprint que começa em até estes dias (ou já ativa) é "iminente" para o refinamento (§15.5). */
export const IMMINENT_SPRINT_DAYS = 5;

/** Riscos a partir desta gravidade colocam a entrega em risco no cálculo de saúde. */
export const SIGNIFICANT_RISK_SEVERITIES: readonly RiskSeverityValue[] = ["HIGH", "CRITICAL"];

const DAY_MS = 24 * 60 * 60 * 1000;

export function isClosedExecution(status: ExecutionStatusValue): boolean {
  return status === "DONE" || status === "CANCELLED";
}

/**
 * Classificação determinística de saúde a partir de dados explícitos (§14.4, §25.8). Ordem:
 * encerrado → não se aplica; bloqueio total → BLOCKED; compromisso vencido → DELAYED; sinal de
 * risco ou previsão posterior ao compromisso → AT_RISK; sem compromisso ou sem previsão →
 * UNKNOWN (RN-012, §3.4); caso contrário → ON_TRACK.
 */
export function classifyHealth(
  input: {
    closed: boolean;
    committedDate: string | null;
    forecastDate: string | null;
    blocked: boolean;
    atRisk: boolean;
  },
  today: string,
): HealthStatusValue | null {
  if (input.closed) return null;
  if (input.blocked) return "BLOCKED";
  if (input.committedDate && input.committedDate < today) return "DELAYED";
  if (input.atRisk) return "AT_RISK";
  if (!input.committedDate || !input.forecastDate) return "UNKNOWN";
  if (input.forecastDate > input.committedDate) return "AT_RISK";
  return "ON_TRACK";
}

/** Riscos e impedimentos abertos ligados à entrega, no formato que o cálculo usa. */
export type OpenRiskSignal = { type: "RISK" | "IMPEDIMENT"; severity: RiskSeverityValue; blockingLevel: BlockingLevelValue | null };

export function riskSignals(risks: readonly OpenRiskSignal[]): { blocked: boolean; atRisk: boolean } {
  return {
    blocked: risks.some((r) => r.type === "IMPEDIMENT" && r.blockingLevel !== "PARTIAL"),
    atRisk: risks.some(
      (r) => (r.type === "IMPEDIMENT" && r.blockingLevel === "PARTIAL") || SIGNIFICANT_RISK_SEVERITIES.includes(r.severity),
    ),
  };
}

/** Saúde calculada de um item acompanhado (§14.2 "risco calculado"). */
export function calculateDeliveryHealth(
  item: {
    executionStatus: ExecutionStatusValue;
    committedDate: string | null;
    forecastDate: string | null;
    openRisks: readonly OpenRiskSignal[];
  },
  today: string,
): HealthStatusValue | null {
  return classifyHealth(
    {
      closed: isClosedExecution(item.executionStatus),
      committedDate: item.committedDate,
      forecastDate: item.forecastDate,
      ...riskSignals(item.openRisks),
    },
    today,
  );
}

/**
 * A avaliação manual prevalece na exibição, mas a calculada continua disponível (§14.4, §3.5).
 * Itens encerrados não têm saúde.
 */
export function effectiveHealth(
  closed: boolean,
  manual: HealthStatusValue | null,
  calculated: HealthStatusValue | null,
): HealthStatusValue | null {
  if (closed) return null;
  return manual ?? calculated;
}

/** Acompanhamento aberto sem verificação recente (§14.5). Nunca verificado também é desatualizado. */
export function isTrackingStale(
  closed: boolean,
  lastCheckedAt: string | null,
  now: Date = new Date(),
  staleDays: number = TRACKING_STALE_DAYS,
): boolean {
  if (closed) return false;
  if (!lastCheckedAt) return true;
  return now.getTime() - new Date(lastCheckedAt).getTime() > staleDays * DAY_MS;
}

/** Dias inteiros desde a última verificação; `null` quando nunca verificado. */
export function daysSince(iso: string | null, now?: Date): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor(((now ?? new Date()).getTime() - new Date(iso).getTime()) / DAY_MS));
}

/** Prioridade de atenção na listagem: o que exige ação primeiro (§5.2.3). */
export const HEALTH_RANK: Record<HealthStatusValue, number> = {
  BLOCKED: 0,
  DELAYED: 1,
  AT_RISK: 2,
  UNKNOWN: 3,
  ON_TRACK: 4,
};

export function isSprintImminent(
  sprint: { status: SprintStatusValue; startDate: string },
  today: string,
  days: number = IMMINENT_SPRINT_DAYS,
): boolean {
  if (sprint.status === "ACTIVE") return true;
  return sprint.status === "PLANNED" && sprint.startDate <= addDays(today, days);
}

/**
 * Item que vai entrar (ou já está) em sprint iminente sem estar pronto gera alerta (§15.5).
 * Refinamento cancelado ou execução encerrada não alertam.
 */
export function isNotReadyForImminentSprint(
  item: {
    executionStatus: ExecutionStatusValue;
    refinementStatus: RefinementStatusValue;
    sprints: readonly { status: SprintStatusValue; startDate: string }[];
  },
  today: string,
): boolean {
  if (isClosedExecution(item.executionStatus)) return false;
  if (item.refinementStatus === "READY" || item.refinementStatus === "CANCELLED") return false;
  return item.sprints.some((sprint) => isSprintImminent(sprint, today));
}

/** Checklist completo sugere "pronto", sem aplicar sozinho (§15.5, §3.5). */
export function suggestsReady(status: RefinementStatusValue, checklist: { total: number; checked: number }): boolean {
  return status !== "READY" && status !== "CANCELLED" && checklist.total > 0 && checklist.checked === checklist.total;
}

/** Checklist de prontidão inicial (§15.4); cada refinamento pode acrescentar ou remover itens. */
export const DEFAULT_READINESS_CHECKLIST = [
  "Objetivo compreendido",
  "Critérios de aceite claros",
  "Dependências identificadas",
  "Dúvidas resolvidas",
  "Solução técnica discutida",
  "Estimativa disponível",
  "Condições para execução atendidas",
] as const;

import {
  Archive,
  Ban,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleHelp,
  CircleSlash,
  CircleX,
  Clock,
  ClockAlert,
  Equal,
  Eye,
  Flame,
  Gavel,
  GitBranch,
  Hourglass,
  Lightbulb,
  LoaderCircle,
  Lock,
  LockOpen,
  Megaphone,
  MessageCircleQuestion,
  OctagonX,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trophy,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

/**
 * Tons semânticos do design system. Cada tom tem três tokens:
 * `--{tone}` (base), `--{tone}-subtle` (fundo) e `--{tone}-fg` (texto).
 */
export type Tone =
  | "neutral"
  | "info"
  | "success"
  | "attention"
  | "warning"
  | "danger"
  | "blocked"
  | "personal"
  | "delivery"
  | "capacity";

export type StatusMeta = {
  label: string;
  tone: Tone;
  icon: LucideIcon;
  /** Estado sem dados suficientes: renderizado com padrão hachurado e borda tracejada. */
  indeterminate?: boolean;
  /** Estado transitório: ícone animado. */
  busy?: boolean;
  description?: string;
};

type StatusMap<K extends string> = Record<K, StatusMeta>;

/* -------------------------------------------------------------------------- */
/* Saúde de entrega (DeliveryTracking.health_status + classificação §25.8)    */
/* -------------------------------------------------------------------------- */
export const healthStatus = {
  ON_TRACK: {
    label: "No prazo",
    tone: "success",
    icon: CircleCheck,
    description: "Previsão compatível com o compromisso, sem risco relevante.",
  },
  ATTENTION: {
    label: "Atenção",
    tone: "attention",
    icon: Eye,
    description: "Margem pequena ou confiança reduzida.",
  },
  AT_RISK: {
    label: "Em risco",
    tone: "warning",
    icon: TriangleAlert,
    description: "Previsão posterior ao compromisso ou risco significativo.",
  },
  DELAYED: {
    label: "Atrasada",
    tone: "danger",
    icon: ClockAlert,
    description: "Compromisso vencido com entrega pendente.",
  },
  BLOCKED: {
    label: "Bloqueada",
    tone: "blocked",
    icon: OctagonX,
    description: "Impedimento ativo que inviabiliza avanço.",
  },
  UNKNOWN: {
    label: "Indeterminada",
    tone: "neutral",
    icon: CircleHelp,
    indeterminate: true,
    description: "Informações insuficientes para classificar.",
  },
} satisfies StatusMap<string>;
export type HealthStatus = keyof typeof healthStatus;

/* -------------------------------------------------------------------------- */
/* Atividades pessoais (§6.4)                                                 */
/* -------------------------------------------------------------------------- */
export const taskStatus = {
  TODO: { label: "A fazer", tone: "neutral", icon: Circle },
  IN_PROGRESS: { label: "Em andamento", tone: "info", icon: CircleDot },
  BLOCKED: { label: "Bloqueada", tone: "blocked", icon: OctagonX },
  DONE: { label: "Concluída", tone: "success", icon: CircleCheck },
  CANCELLED: { label: "Cancelada", tone: "neutral", icon: CircleSlash },
} satisfies StatusMap<string>;
export type TaskStatus = keyof typeof taskStatus;

/* Prioridade pessoal (§6.5) — independente da criticidade da entrega (RN-004) */
export const priority = {
  CRITICAL: { label: "Crítica", tone: "danger", icon: ChevronsUp },
  HIGH: { label: "Alta", tone: "warning", icon: ChevronUp },
  MEDIUM: { label: "Média", tone: "info", icon: Equal },
  LOW: { label: "Baixa", tone: "neutral", icon: ChevronDown },
} satisfies StatusMap<string>;
export type Priority = keyof typeof priority;

/* -------------------------------------------------------------------------- */
/* Organização                                                                */
/* -------------------------------------------------------------------------- */
export const projectStatus = {
  ACTIVE: { label: "Ativo", tone: "success", icon: Play },
  PAUSED: { label: "Pausado", tone: "attention", icon: Pause },
  ARCHIVED: { label: "Arquivado", tone: "neutral", icon: Archive },
} satisfies StatusMap<string>;
export type ProjectStatus = keyof typeof projectStatus;

export const sprintStatus = {
  PLANNED: { label: "Planejada", tone: "neutral", icon: CalendarClock },
  ACTIVE: { label: "Ativa", tone: "info", icon: Play },
  CLOSED: { label: "Encerrada", tone: "neutral", icon: Lock },
  CANCELLED: { label: "Cancelada", tone: "neutral", icon: CircleSlash },
} satisfies StatusMap<string>;
export type SprintStatus = keyof typeof sprintStatus;

/* Refinamento (§15.3) — independente da execução (RN-007) */
export const refinementStatus = {
  NEEDS_REFINEMENT: { label: "Aguardando refinamento", tone: "neutral", icon: CircleDashed },
  ANALYZING: { label: "Em análise", tone: "info", icon: Search },
  WAITING_INFORMATION: { label: "Com dúvidas", tone: "attention", icon: MessageCircleQuestion },
  READY: { label: "Pronta", tone: "success", icon: CircleCheck },
  CANCELLED: { label: "Cancelada", tone: "neutral", icon: CircleSlash },
} satisfies StatusMap<string>;
export type RefinementStatus = keyof typeof refinementStatus;

/* -------------------------------------------------------------------------- */
/* Previsibilidade                                                            */
/* -------------------------------------------------------------------------- */

/* Estado da previsão (§43.4) */
export const forecastState = {
  UP_TO_DATE: { label: "Atualizada", tone: "success", icon: CircleCheck },
  RECALCULATING: { label: "Em recálculo", tone: "info", icon: RefreshCw, busy: true },
  STALE: { label: "Obsoleta", tone: "attention", icon: Hourglass },
  INDETERMINATE: { label: "Indeterminada", tone: "neutral", icon: CircleHelp, indeterminate: true },
  FAILED: { label: "Falha de cálculo", tone: "danger", icon: CircleX },
} satisfies StatusMap<string>;
export type ForecastState = keyof typeof forecastState;

/* Confiança (§21.4 / §25.7) */
export const confidence = {
  HIGH: { label: "Alta", tone: "success", icon: CircleCheck },
  MEDIUM: { label: "Média", tone: "attention", icon: Equal },
  LOW: { label: "Baixa", tone: "warning", icon: TriangleAlert },
} satisfies StatusMap<string>;
export type Confidence = keyof typeof confidence;

/* -------------------------------------------------------------------------- */
/* Recomendações (§28.6 / §28.7)                                              */
/* -------------------------------------------------------------------------- */
export const recommendationStatus = {
  GENERATED: { label: "Gerada", tone: "info", icon: Sparkles },
  REVIEWING: { label: "Em análise", tone: "attention", icon: Eye },
  APPROVED: { label: "Aprovada", tone: "delivery", icon: Gavel },
  APPLIED: { label: "Aplicada", tone: "success", icon: CircleCheck },
  REJECTED: { label: "Rejeitada", tone: "neutral", icon: CircleX },
  EXPIRED: { label: "Expirada", tone: "neutral", icon: Hourglass },
  FAILED: { label: "Falhou", tone: "danger", icon: TriangleAlert },
} satisfies StatusMap<string>;
export type RecommendationStatus = keyof typeof recommendationStatus;

export const impact = {
  LOW: { label: "Impacto baixo", tone: "neutral", icon: ChevronDown },
  MEDIUM: { label: "Impacto médio", tone: "attention", icon: Equal },
  HIGH: { label: "Impacto alto", tone: "danger", icon: ChevronsUp },
} satisfies StatusMap<string>;
export type Impact = keyof typeof impact;

/* -------------------------------------------------------------------------- */
/* Jobs assíncronos (§41.4)                                                   */
/* -------------------------------------------------------------------------- */
export const jobStatus = {
  QUEUED: { label: "Na fila", tone: "neutral", icon: Clock },
  RUNNING: { label: "Executando", tone: "info", icon: LoaderCircle, busy: true },
  RETRYING: { label: "Nova tentativa", tone: "attention", icon: RotateCcw },
  COMPLETED: { label: "Concluído", tone: "success", icon: CircleCheck },
  FAILED: { label: "Falhou", tone: "danger", icon: CircleX },
  CANCELLED: { label: "Cancelado", tone: "neutral", icon: Ban },
} satisfies StatusMap<string>;
export type JobStatus = keyof typeof jobStatus;

/* -------------------------------------------------------------------------- */
/* Diário de bordo (§17.2)                                                    */
/* -------------------------------------------------------------------------- */
export const journalCategory = {
  TECH_DECISION: { label: "Decisão técnica", tone: "delivery", icon: Gavel },
  INCIDENT: { label: "Incidente", tone: "danger", icon: Flame },
  BLOCK: { label: "Bloqueio", tone: "blocked", icon: OctagonX },
  UNBLOCK: { label: "Desbloqueio", tone: "success", icon: LockOpen },
  LEARNING: { label: "Aprendizado", tone: "personal", icon: Lightbulb },
  SCOPE_CHANGE: { label: "Mudança de escopo", tone: "attention", icon: GitBranch },
  ACHIEVEMENT: { label: "Conquista", tone: "success", icon: Trophy },
  RISK: { label: "Risco", tone: "warning", icon: ShieldAlert },
  GENERAL: { label: "Acontecimento geral", tone: "neutral", icon: Megaphone },
} satisfies StatusMap<string>;
export type JournalCategory = keyof typeof journalCategory;

/* -------------------------------------------------------------------------- */
/* Escopo de sprint (§11.5)                                                   */
/* -------------------------------------------------------------------------- */
export const scopeType = {
  ORIGINAL: { label: "Original", tone: "neutral", icon: Circle },
  ADDED: { label: "Adicionado", tone: "attention", icon: ChevronUp },
  MOVED: { label: "Remanejado", tone: "info", icon: GitBranch },
} satisfies StatusMap<string>;
export type ScopeType = keyof typeof scopeType;

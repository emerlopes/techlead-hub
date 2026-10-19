import { draftTypeLabels } from "@tlh/shared-contracts";
import {
  Archive,
  ArrowLeftFromLine,
  ArrowRightToLine,
  MessagesSquare,
  Presentation,
  ArrowDownUp,
  ArrowRightLeft,
  CirclePlay,
  Columns2,
  FilePen,
  Globe,
  Info,
  Layers,
  ListOrdered,
  Route,
  Shuffle,
  Unplug,
  UserCog,
  Workflow,
  Ban,
  BookOpen,
  Bug,
  CalendarX,
  Coffee,
  GraduationCap,
  LifeBuoy,
  Percent,
  Plane,
  CalendarClock,
  CalendarDays,
  CalendarRange,
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
  ExternalLink,
  Eye,
  Gauge,
  FileSearch,
  Flame,
  Flag,
  FlaskConical,
  Gavel,
  GitBranch,
  History,
  Hourglass,
  Lightbulb,
  Link2,
  LoaderCircle,
  Lock,
  LockOpen,
  Megaphone,
  MessageCircleQuestion,
  OctagonX,
  Pause,
  Play,
  RefreshCw,
  Rocket,
  RotateCcw,
  Search,
  ShieldAlert,
  Shapes,
  Sparkles,
  TrendingUp,
  Trophy,
  TriangleAlert,
  Undo2,
  UserCheck,
  UserRound,
  Users,
  UserX,
  Wrench,
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

/* Alerta de prazo (§5.2.2, §6.6) — independente da ordem da fila de foco */
export const taskDueState = {
  OVERDUE: { label: "Atrasada", tone: "danger", icon: ClockAlert },
  DUE_TODAY: { label: "Vence hoje", tone: "attention", icon: CalendarClock },
  DUE_SOON: { label: "Vence em breve", tone: "info", icon: CalendarDays },
} satisfies StatusMap<string>;
export type TaskDueState = keyof typeof taskDueState;

/* Tipos de atividade (§6.3) */
export const taskType = {
  TECHNICAL: { label: "Técnica", tone: "personal", icon: Wrench },
  FOLLOW_UP: { label: "Acompanhamento", tone: "personal", icon: Eye },
  DECISION: { label: "Decisão", tone: "personal", icon: Gavel },
  MEETING: { label: "Reunião", tone: "personal", icon: Users },
  PLANNING: { label: "Planejamento", tone: "personal", icon: CalendarRange },
  REVIEW: { label: "Revisão", tone: "personal", icon: FileSearch },
  INVESTIGATION: { label: "Investigação", tone: "personal", icon: Search },
  OTHER: { label: "Outra", tone: "neutral", icon: Shapes },
} satisfies StatusMap<string>;
export type TaskType = keyof typeof taskType;

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
export const teamStatus = {
  ACTIVE: { label: "Ativo", tone: "success", icon: Play },
  INACTIVE: { label: "Inativo", tone: "neutral", icon: CircleSlash },
} satisfies StatusMap<string>;
export type TeamStatus = keyof typeof teamStatus;

export const developerStatus = {
  ACTIVE: { label: "Ativo", tone: "success", icon: UserCheck },
  INACTIVE: { label: "Inativo", tone: "neutral", icon: UserX },
} satisfies StatusMap<string>;
export type DeveloperStatus = keyof typeof developerStatus;

/* Participação em time/projeto (§9) — encerrada continua no histórico (RN-025) */
export const membershipStatus = {
  ACTIVE: { label: "Ativa", tone: "success", icon: Link2 },
  ENDED: { label: "Encerrada", tone: "neutral", icon: History },
} satisfies StatusMap<string>;
export type MembershipStatus = keyof typeof membershipStatus;

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

/* -------------------------------------------------------------------------- */
/* Itens externos e acompanhamento (§13, §14)                                 */
/* -------------------------------------------------------------------------- */

/* Execução do item (§13.4) — independente do refinamento (RN-007) */
export const executionStatus = {
  NOT_STARTED: { label: "Não iniciada", tone: "neutral", icon: Circle },
  IN_PROGRESS: { label: "Em andamento", tone: "info", icon: CircleDot },
  IN_REVIEW: { label: "Em revisão", tone: "info", icon: FileSearch },
  DONE: { label: "Concluída", tone: "success", icon: CircleCheck },
  CANCELLED: { label: "Cancelada", tone: "neutral", icon: CircleSlash },
} satisfies StatusMap<string>;
export type ExecutionStatus = keyof typeof executionStatus;

/* Tipos de item externo (§13.5) */
export const workItemType = {
  STORY: { label: "História", tone: "delivery", icon: BookOpen },
  BUG: { label: "Bug", tone: "delivery", icon: Bug },
  TECHNICAL_TASK: { label: "Tarefa técnica", tone: "delivery", icon: Wrench },
  SPIKE: { label: "Spike", tone: "delivery", icon: FlaskConical },
  IMPROVEMENT: { label: "Melhoria", tone: "delivery", icon: TrendingUp },
  OTHER: { label: "Outro", tone: "neutral", icon: Shapes },
} satisfies StatusMap<string>;
export type WorkItemType = keyof typeof workItemType;

/* Origem da informação de situação (§14.3 status_source) */
export const statusSource = {
  TECH_LEAD: { label: "Tech Lead", tone: "neutral", icon: UserCheck },
  DEVELOPER: { label: "Desenvolvedor", tone: "neutral", icon: UserRound },
  EXTERNAL_TOOL: { label: "Ferramenta externa", tone: "neutral", icon: ExternalLink },
  MEETING: { label: "Reunião", tone: "neutral", icon: Users },
} satisfies StatusMap<string>;
export type StatusSource = keyof typeof statusSource;

/* Refinamento (§15.3) — independente da execução (RN-007) */
export const refinementStatus = {
  NEEDS_REFINEMENT: { label: "Aguardando refinamento", tone: "neutral", icon: CircleDashed },
  ANALYZING: { label: "Em análise", tone: "info", icon: Search },
  WAITING_INFORMATION: { label: "Com dúvidas", tone: "attention", icon: MessageCircleQuestion },
  READY: { label: "Pronta", tone: "success", icon: CircleCheck },
  CANCELLED: { label: "Cancelada", tone: "neutral", icon: CircleSlash },
} satisfies StatusMap<string>;
export type RefinementStatus = keyof typeof refinementStatus;

/* Saída de uma sprint (§11.5) — a participação continua no histórico (RN-010) */
export const sprintExitReason = {
  COMPLETED: { label: "Concluído na sprint", tone: "success", icon: CircleCheck },
  NOT_COMPLETED: { label: "Não concluído", tone: "attention", icon: Hourglass },
  MOVED: { label: "Remanejado", tone: "info", icon: GitBranch },
  REMOVED: { label: "Removido", tone: "neutral", icon: Undo2 },
} satisfies StatusMap<string>;
export type SprintExitReason = keyof typeof sprintExitReason;

/* Releases (§12) */
export const releaseStatus = {
  PLANNED: { label: "Planejada", tone: "neutral", icon: CalendarClock },
  IN_PROGRESS: { label: "Em andamento", tone: "info", icon: Play },
  RELEASED: { label: "Entregue", tone: "success", icon: Rocket },
  CANCELLED: { label: "Cancelada", tone: "neutral", icon: CircleSlash },
} satisfies StatusMap<string>;
export type ReleaseStatus = keyof typeof releaseStatus;

/* Item obrigatório × opcional da release (§12.2) */
export const releaseRequirement = {
  REQUIRED: { label: "Obrigatório", tone: "delivery", icon: Lock },
  OPTIONAL: { label: "Opcional", tone: "neutral", icon: CircleDashed },
} satisfies StatusMap<string>;
export type ReleaseRequirement = keyof typeof releaseRequirement;

/* -------------------------------------------------------------------------- */
/* Riscos e impedimentos (§16)                                                */
/* -------------------------------------------------------------------------- */
export const riskType = {
  RISK: { label: "Risco", tone: "warning", icon: ShieldAlert },
  IMPEDIMENT: { label: "Impedimento", tone: "blocked", icon: OctagonX },
} satisfies StatusMap<string>;
export type RiskType = keyof typeof riskType;

export const riskSeverity = {
  CRITICAL: { label: "Gravidade crítica", tone: "danger", icon: ChevronsUp },
  HIGH: { label: "Gravidade alta", tone: "warning", icon: ChevronUp },
  MEDIUM: { label: "Gravidade média", tone: "attention", icon: Equal },
  LOW: { label: "Gravidade baixa", tone: "neutral", icon: ChevronDown },
} satisfies StatusMap<string>;
export type RiskSeverity = keyof typeof riskSeverity;

export const riskProbability = {
  HIGH: { label: "Probabilidade alta", tone: "warning", icon: ChevronUp },
  MEDIUM: { label: "Probabilidade média", tone: "attention", icon: Equal },
  LOW: { label: "Probabilidade baixa", tone: "neutral", icon: ChevronDown },
} satisfies StatusMap<string>;
export type RiskProbability = keyof typeof riskProbability;

/* Resolvido continua consultável (RN-008) */
export const riskStatus = {
  OPEN: { label: "Aberto", tone: "warning", icon: CircleDot },
  MONITORING: { label: "Em monitoramento", tone: "attention", icon: Eye },
  RESOLVED: { label: "Resolvido", tone: "success", icon: CircleCheck },
  CANCELLED: { label: "Cancelado", tone: "neutral", icon: CircleSlash },
} satisfies StatusMap<string>;
export type RiskStatus = keyof typeof riskStatus;

/* Impedimento bloqueia total ou parcialmente (§16.4) */
export const blockingLevel = {
  FULL: { label: "Bloqueio total", tone: "blocked", icon: OctagonX },
  PARTIAL: { label: "Bloqueio parcial", tone: "warning", icon: TriangleAlert },
} satisfies StatusMap<string>;
export type BlockingLevel = keyof typeof blockingLevel;

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

/* -------------------------------------------------------------------------- */
/* Capacidade (§18–§21)                                                       */
/* -------------------------------------------------------------------------- */

/* Tipos de exceção de calendário (§19.3) */
export const availabilityExceptionType = {
  VACATION: { label: "Férias", tone: "info", icon: Plane },
  DAY_OFF: { label: "Folga", tone: "neutral", icon: Coffee },
  HOLIDAY: { label: "Feriado", tone: "capacity", icon: CalendarX },
  TRAINING: { label: "Treinamento", tone: "personal", icon: GraduationCap },
  ABSENCE: { label: "Ausência", tone: "neutral", icon: UserX },
  EXTRA_SUPPORT: { label: "Suporte extraordinário", tone: "attention", icon: LifeBuoy },
  OTHER: { label: "Outra indisponibilidade", tone: "neutral", icon: CircleSlash },
} satisfies StatusMap<string>;
export type AvailabilityExceptionType = keyof typeof availabilityExceptionType;

/* Utilização planejada U = D / CA (§25.5) */
export const capacityLevel = {
  HEALTHY: { label: "Saudável", tone: "capacity", icon: Gauge, description: "Demanda abaixo de 85% da capacidade alocada." },
  ATTENTION: { label: "Atenção", tone: "attention", icon: Eye, description: "Demanda entre 85% e 100% da capacidade alocada." },
  OVERLOADED: { label: "Sobrecarga", tone: "danger", icon: Flame, description: "Demanda acima da capacidade alocada." },
  NO_CAPACITY: {
    label: "Sem capacidade",
    tone: "neutral",
    icon: CircleHelp,
    indeterminate: true,
    description: "Nenhuma capacidade alocada: a utilização não é calculada (§25.5).",
  },
} satisfies StatusMap<string>;
export type CapacityLevel = keyof typeof capacityLevel;

/* Inconsistências de alocação sinalizadas antes da previsão (§20.5) */
export const capacityIssueType = {
  OVER_ALLOCATED: {
    label: "Acima da capacidade",
    tone: "danger",
    icon: TrendingUp,
    description: "Alocações somam mais horas que a capacidade efetiva no período (CA-011).",
  },
  PERCENTAGE_OVER_LIMIT: {
    label: "Mais de 100%",
    tone: "danger",
    icon: Percent,
    description: "Alocações percentuais somam mais de 100% em algum dia (RN-029).",
  },
  NO_SCHEDULE: {
    label: "Sem jornada",
    tone: "neutral",
    icon: CalendarX,
    indeterminate: true,
    description: "Há alocação em dias sem jornada cadastrada: a capacidade é desconhecida.",
  },
  NOT_TEAM_MEMBER: {
    label: "Fora do time",
    tone: "attention",
    icon: UserX,
    description: "Alocação em um time do qual a pessoa não participa no período.",
  },
  INACTIVE_CONTEXT: {
    label: "Contexto inativo",
    tone: "attention",
    icon: Archive,
    description: "Alocação em time inativo, projeto arquivado ou pessoa desativada.",
  },
} satisfies StatusMap<string>;
export type CapacityIssueType = keyof typeof capacityIssueType;

/* -------------------------------------------------------------------------- */
/* Planejamento de execução (§22–§24)                                         */
/* -------------------------------------------------------------------------- */

/* Modos de execução (§22.2) */
export const executionMode = {
  SEQUENTIAL: { label: "Sequencial", tone: "capacity", icon: ListOrdered, description: "Um item por vez, na ordem da fila (padrão)." },
  PARALLEL: { label: "Paralelo", tone: "capacity", icon: Columns2, description: "Todos os itens ao mesmo tempo, cada um com a sua parcela." },
  HYBRID: { label: "Híbrido", tone: "capacity", icon: Layers, description: "Fila ordenada com até N itens simultâneos." },
} satisfies StatusMap<string>;
export type ExecutionMode = keyof typeof executionMode;

/* Políticas de redistribuição (§23) */
export const redistributionPolicy = {
  NONE: { label: "Sem redistribuição", tone: "neutral", icon: CircleSlash, description: "Capacidade não usada fica livre." },
  SAME_CONTEXT: {
    label: "Mesmo contexto",
    tone: "capacity",
    icon: Shuffle,
    description: "A sobra vai para outros itens elegíveis da fila (recomendada, §23.4).",
  },
  CROSS_CONTEXT: {
    label: "Entre contextos",
    tone: "attention",
    icon: ArrowRightLeft,
    description: "A sobra também pode ir para outros planos da pessoa que autorizaram — altera compromissos de outros times.",
  },
} satisfies StatusMap<string>;
export type RedistributionPolicy = keyof typeof redistributionPolicy;

/* Situação do plano */
export const executionPlanStatus = {
  DRAFT: { label: "Rascunho", tone: "neutral", icon: FilePen, description: "Projetado isolado; não consome a capacidade do contexto." },
  ACTIVE: { label: "Ativo", tone: "info", icon: CirclePlay },
  ARCHIVED: { label: "Arquivado", tone: "neutral", icon: Archive },
} satisfies StatusMap<string>;
export type ExecutionPlanStatus = keyof typeof executionPlanStatus;

/* Item na projeção do plano */
export const planItemState = {
  DONE: { label: "Concluído", tone: "success", icon: CircleCheck },
  COMPLETES: { label: "Conclui no período", tone: "capacity", icon: Flag },
  IN_PROGRESS: { label: "Em execução no fim", tone: "attention", icon: LoaderCircle, description: "Começa, mas não termina no período." },
  NOT_STARTED: { label: "Após o período", tone: "neutral", icon: Hourglass, description: "Aguarda vaga na fila além do período." },
  WAITING_DEPENDENCY: { label: "Aguarda dependência", tone: "blocked", icon: Link2, description: "Só começa depois de liberada (§24)." },
  BLOCKED: { label: "Bloqueado", tone: "blocked", icon: Lock, description: "Bloqueio total não consome capacidade (§22.5)." },
  NO_ESTIMATE: {
    label: "Sem estimativa",
    tone: "neutral",
    icon: CircleHelp,
    indeterminate: true,
    description: "Sem esforço restante não há como projetar (§3.4).",
  },
  INDETERMINATE: {
    label: "Indeterminado",
    tone: "neutral",
    icon: CircleDashed,
    indeterminate: true,
    description: "Atrás de um item sem estimativa na fila.",
  },
} satisfies StatusMap<string>;
export type PlanItemState = keyof typeof planItemState;

/* Sinalizações do plano */
export const planIssueType = {
  NO_CAPACITY: {
    label: "Sem capacidade no contexto",
    tone: "neutral",
    icon: CircleHelp,
    indeterminate: true,
    description: "Nenhuma alocação com este time e projeto no período: crie uma alocação para o contexto.",
  },
  CAPACITY_CONFLICT: {
    label: "Conflito de alocação",
    tone: "danger",
    icon: TrendingUp,
    description: "A pessoa tem alocações acima da capacidade efetiva no período (CA-011).",
  },
  NO_ESTIMATE: { label: "Sem estimativa", tone: "neutral", icon: CircleHelp, description: "Itens sem esforço restante tornam a projeção incompleta (RN-039)." },
  BLOCKED: { label: "Bloqueado", tone: "blocked", icon: Lock, description: "Itens com bloqueio total não consomem capacidade." },
  DEPENDENCY_UNKNOWN: {
    label: "Dependência sem previsão",
    tone: "blocked",
    icon: Unplug,
    description: "Dependência externa sem data ou predecessor fora de planos ativos: sem data arbitrária (CA-018).",
  },
  DEPENDENCY_ORDER: {
    label: "Ordem contra dependência",
    tone: "attention",
    icon: ArrowDownUp,
    description: "Item antes do predecessor na fila: ele espera, e quem vem depois avança.",
  },
  ASSIGNEE_MISMATCH: {
    label: "Outro responsável",
    tone: "attention",
    icon: UserCog,
    description: "O acompanhamento indica outra pessoa como responsável pelo item.",
  },
  UNFINISHED_IN_PERIOD: {
    label: "Não cabe no período",
    tone: "warning",
    icon: Hourglass,
    description: "Itens que não terminam até o fim do plano.",
  },
} satisfies StatusMap<string>;
export type PlanIssueType = keyof typeof planIssueType;

/* Tipos de dependência (§24.3) */
export const dependencyType = {
  FINISH_TO_START: { label: "Término → início", tone: "delivery", icon: Route, description: "O sucessor só começa quando o predecessor termina." },
  START_TO_START: { label: "Início → início", tone: "neutral", icon: Workflow, description: "Registrada; ainda não afeta o cálculo (§24.4)." },
  FINISH_TO_FINISH: { label: "Término → término", tone: "neutral", icon: Workflow, description: "Registrada; ainda não afeta o cálculo (§24.4)." },
  EXTERNAL: { label: "Externa", tone: "delivery", icon: Globe, description: "Depende de algo fora do hub, com data de liberação quando conhecida." },
  INFORMATIONAL: { label: "Informativa", tone: "neutral", icon: Info, description: "Só contexto; não afeta o cálculo." },
} satisfies StatusMap<string>;
export type DependencyType = keyof typeof dependencyType;

/* Situação da dependência no cálculo */
export const dependencyState = {
  RELEASED: { label: "Liberada", tone: "success", icon: LockOpen },
  PENDING: { label: "Pendente", tone: "attention", icon: Hourglass },
  UNKNOWN: { label: "Sem previsão", tone: "blocked", icon: Unplug, indeterminate: true, description: "Sem data de liberação conhecida (CA-018)." },
  NOT_CALCULATED: { label: "Só registro", tone: "neutral", icon: Info, description: "Tipo ainda sem efeito no cálculo (§24.4)." },
} satisfies StatusMap<string>;
export type DependencyState = keyof typeof dependencyState;

/* -------------------------------------------------------------------------- */
/* Relatórios (§31)                                                           */
/* -------------------------------------------------------------------------- */

/* Alterações de escopo durante a sprint (§11.5) */
export const scopeChangeKind = {
  ADDED: { label: "Adicionado", tone: "attention", icon: ChevronUp },
  MOVED_IN: { label: "Veio de outra sprint", tone: "info", icon: ArrowRightToLine },
  REMOVED: { label: "Retirado", tone: "neutral", icon: Undo2 },
  MOVED_OUT: { label: "Foi para outra sprint", tone: "info", icon: ArrowLeftFromLine },
} satisfies StatusMap<string>;
export type ScopeChangeKind = keyof typeof scopeChangeKind;

/* Rascunhos gerados a partir da sprint (§31.4, §31.5) */
export const reportDraftType = {
  SPRINT_DEMO: { label: draftTypeLabels.SPRINT_DEMO, tone: "delivery", icon: Presentation },
  SPRINT_RETROSPECTIVE: { label: draftTypeLabels.SPRINT_RETROSPECTIVE, tone: "delivery", icon: MessagesSquare },
} satisfies StatusMap<string>;
export type ReportDraftType = keyof typeof reportDraftType;

/* Seção de rascunho sem conteúdo: nada registrado × ainda não gerado pelo sistema (§31.5) */
export const draftSectionState = {
  NO_DATA: {
    label: "Nada registrado",
    tone: "neutral",
    icon: CircleDashed,
    indeterminate: true,
    description: "Sem registros no período: a seção fica vazia em vez de inventar fatos (§31.5).",
  },
  NOT_GENERATED: {
    label: "Não gerado",
    tone: "neutral",
    icon: CircleSlash,
    indeterminate: true,
    description: "O sistema ainda não sugere ações: preencha durante a reunião (§3.5).",
  },
} satisfies StatusMap<string>;
export type DraftSectionState = keyof typeof draftSectionState;

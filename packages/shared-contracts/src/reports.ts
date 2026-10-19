import { z } from "zod";
import { capacityOverviewQuerySchema, capacityOverviewSchema } from "./capacity";
import { estimateConfidences } from "./capacity-rules";
import { contextRefSchema, namedRefSchema, workItemRefSchema } from "./common";
import { journalEntrySchema } from "./journal";
import { workDependencySchema } from "./planning";
import { releaseItemSchema, releaseSchema } from "./releases";
import { riskSchema } from "./risks";
import { sprintItemSchema, sprintSchema, sprintSummarySchema } from "./sprints";

/* -------------------------------------------------------------------------- */
/* Relatórios (§31, §36.16)                                                   */
/*                                                                            */
/* Derivados na leitura do que já está registrado: nada é persistido e nenhuma */
/* seção é preenchida sem dado (§3.4, §31.5). Pendências: ver                  */
/* docs/architecture/relatorios-operacao.md (PEND-9-xx).                       */
/* -------------------------------------------------------------------------- */

/* Relatório de sprint (§31.1) ------------------------------------------------ */

export const scopeChangeKinds = ["ADDED", "MOVED_IN", "REMOVED", "MOVED_OUT"] as const;
export type ScopeChangeKind = (typeof scopeChangeKinds)[number];

/** Alteração de escopo durante a sprint (§11.5), em ordem cronológica. */
export const scopeChangeSchema = z.object({
  kind: z.enum(scopeChangeKinds),
  at: z.iso.datetime(),
  workItem: workItemRefSchema,
});
export type ScopeChange = z.infer<typeof scopeChangeSchema>;

export const sprintReportSchema = z.object({
  generatedAt: z.iso.datetime(),
  /** Identificação, objetivo, período e capacidade × demanda (§5.2.4). */
  sprint: sprintSchema,
  summary: sprintSummarySchema,
  /** Itens planejados antes do início, inclusive os que saíram depois. */
  originalScope: z.array(sprintItemSchema),
  scopeChanges: z.array(scopeChangeSchema),
  completed: z.array(sprintItemSchema),
  /** Escopo final não concluído. */
  pending: z.array(sprintItemSchema),
  /** Pendentes com saúde "Bloqueada" (§14.4). */
  blockedItems: z.array(sprintItemSchema),
  /** Impedimentos ligados à sprint ou aos itens dela que estavam vigentes no período (§16). */
  impediments: z.array(riskSchema),
  risks: z.array(riskSchema),
  /** Decisões técnicas do diário (§17.2). */
  decisions: z.array(journalEntrySchema),
  /** Demais acontecimentos do diário, do mais antigo ao mais recente. */
  events: z.array(journalEntrySchema),
});
export type SprintReport = z.infer<typeof sprintReportSchema>;

/* Relatório de release (§31.2) ----------------------------------------------- */

/**
 * Origem da previsão (§26.3). Hoje só existe a manual (`ReleaseForecastHistory`); `CALCULATED` chega com
 * o motor de previsão da Etapa 6 (PEND-9-01) e nunca é emitida antes dele.
 */
export const forecastSources = ["MANUAL", "CALCULATED"] as const;
export type ForecastSource = (typeof forecastSources)[number];

export const reportForecastSchema = z.object({
  date: z.iso.date(),
  source: z.enum(forecastSources),
  /** Só previsões calculadas têm confiança (§25.7); a manual é `null`. */
  confidence: z.enum(estimateConfidences).nullable(),
  /** Quando foi registrada; `null` se anterior ao histórico. */
  recordedAt: z.iso.datetime().nullable(),
});
export type ReportForecast = z.infer<typeof reportForecastSchema>;

export const releaseChangeKinds = ["FORECAST", "SCOPE_REMOVED", "JOURNAL"] as const;
export type ReleaseChangeKind = (typeof releaseChangeKinds)[number];

/** Principais mudanças: compromisso/previsão, retiradas de escopo e registros do diário da release. */
export const releaseChangeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("FORECAST"),
    at: z.iso.datetime(),
    committedDate: z.iso.date().nullable(),
    forecastDate: z.iso.date().nullable(),
  }),
  z.object({ kind: z.literal("SCOPE_REMOVED"), at: z.iso.datetime(), workItem: workItemRefSchema, isRequired: z.boolean() }),
  z.object({ kind: z.literal("JOURNAL"), at: z.iso.datetime(), entry: journalEntrySchema }),
]);
export type ReleaseChange = z.infer<typeof releaseChangeSchema>;

export const releaseReportSchema = z.object({
  generatedAt: z.iso.datetime(),
  /** Projeto, release, compromisso, saúde, progresso e times envolvidos (CA-008). */
  release: releaseSchema,
  /** `null` = "Sem previsão" (§3.4). */
  forecast: reportForecastSchema.nullable(),
  required: z.array(releaseItemSchema),
  optional: z.array(releaseItemSchema),
  /** Dependências em que um item do escopo é o sucessor (§24). */
  dependencies: z.array(workDependencySchema),
  /** Riscos e impedimentos abertos da release ou dos itens do escopo (§16). */
  risks: z.array(riskSchema),
  changes: z.array(releaseChangeSchema),
});
export type ReleaseReport = z.infer<typeof releaseReportSchema>;

/* Relatório de capacidade (§31.3) -------------------------------------------- */

export const capacityReportQuerySchema = capacityOverviewQuerySchema;
export type CapacityReportQuery = z.input<typeof capacityReportQuerySchema>;

/** Mesmos números da visão geral (RN-037): um só cálculo, apresentado como relatório. */
export const capacityReportSchema = capacityOverviewSchema.extend({ generatedAt: z.iso.datetime() });
export type CapacityReport = z.infer<typeof capacityReportSchema>;

/* Rascunhos de demo e retrospectiva (§31.4, §31.5) --------------------------- */

export const reportDraftTypes = ["SPRINT_DEMO", "SPRINT_RETROSPECTIVE"] as const;
export type ReportDraftType = (typeof reportDraftTypes)[number];

export const draftSectionKeys = [
  "COMPLETED_DELIVERIES",
  "RELEVANT_FEATURES",
  "WHAT_WORKED",
  "PROBLEMS",
  "BLOCKS",
  "SCOPE_CHANGES",
  "LEARNINGS",
  "DECISIONS",
  "EVENTS",
  "KNOWN_PENDING",
  "SUGGESTED_ACTIONS",
] as const;
export type DraftSectionKey = (typeof draftSectionKeys)[number];

export const draftSectionLabels: Record<DraftSectionKey, string> = {
  COMPLETED_DELIVERIES: "Entregas concluídas",
  RELEVANT_FEATURES: "Funcionalidades relevantes",
  WHAT_WORKED: "O que funcionou",
  PROBLEMS: "Problemas registrados",
  BLOCKS: "Bloqueios",
  SCOPE_CHANGES: "Mudanças de escopo",
  LEARNINGS: "Aprendizados",
  DECISIONS: "Decisões",
  EVENTS: "Acontecimentos",
  KNOWN_PENDING: "Pendências conhecidas",
  SUGGESTED_ACTIONS: "Ações sugeridas",
};

export const draftTypeLabels: Record<ReportDraftType, string> = {
  SPRINT_DEMO: "Rascunho para demo",
  SPRINT_RETROSPECTIVE: "Rascunho para retrospectiva",
};

/**
 * `FILLED` = há fatos registrados; `NO_DATA` = nada registrado (a seção fica vazia, sem inventar —
 * §31.5); `NOT_GENERATED` = o sistema ainda não gera esse conteúdo (PEND-9-02).
 */
export const draftSectionStates = ["FILLED", "NO_DATA", "NOT_GENERATED"] as const;

export const draftRefKinds = ["WORK_ITEM", "JOURNAL_ENTRY", "RISK"] as const;

/** Um fato da seção, sempre com a origem para conferência (§3.3). */
export const draftEntrySchema = z.object({
  text: z.string(),
  /** Data de negócio do fato, quando houver. */
  date: z.iso.date().nullable(),
  ref: z.object({ kind: z.enum(draftRefKinds), id: z.uuid() }),
});
export type DraftEntry = z.infer<typeof draftEntrySchema>;

export const draftSectionSchema = z.object({
  key: z.enum(draftSectionKeys),
  state: z.enum(draftSectionStates),
  entries: z.array(draftEntrySchema),
});
export type DraftSection = z.infer<typeof draftSectionSchema>;

export const reportDraftSchema = z.object({
  type: z.enum(reportDraftTypes),
  generatedAt: z.iso.datetime(),
  sprint: namedRefSchema.extend({
    team: contextRefSchema,
    goal: z.string().nullable(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
  }),
  sections: z.array(draftSectionSchema),
});
export type ReportDraft = z.infer<typeof reportDraftSchema>;

/** `POST /reports/generate` (§36.16): gera o rascunho na hora, sem persistir. */
export const generateReportSchema = z
  .object({
    type: z.enum(reportDraftTypes, "Selecione o tipo de rascunho."),
    sprintId: z.uuid("Selecione a sprint."),
  })
  .strict();
export type GenerateReportInput = z.input<typeof generateReportSchema>;

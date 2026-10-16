import { z } from "zod";
import {
  contextRefSchema,
  namedRefSchema,
  optionalHours,
  optionalIsoDate,
  optionalText,
  paginationQuerySchema,
  queryFlag,
  versionSchema,
} from "./common";
import {
  blockingLevels,
  executionStatuses,
  healthStatuses,
  refinementStatuses,
  riskSeverities,
  sprintStatuses,
} from "./delivery-rules";

/* Tipos de item (§13.5) e origem da informação de situação (§14.3). */
export const workItemTypes = ["STORY", "BUG", "TECHNICAL_TASK", "SPIKE", "IMPROVEMENT", "OTHER"] as const;
export const statusSources = ["TECH_LEAD", "DEVELOPER", "EXTERNAL_TOOL", "MEETING"] as const;
export const sprintScopeTypes = ["ORIGINAL", "ADDED", "MOVED"] as const;
export const sprintExitReasons = ["COMPLETED", "NOT_COMPLETED", "MOVED", "REMOVED"] as const;

export type WorkItemTypeValue = (typeof workItemTypes)[number];
export type StatusSourceValue = (typeof statusSources)[number];

/* -------------------------------------------------------------------------- */
/* Origens externas (§13.3)                                                   */
/* -------------------------------------------------------------------------- */

const optionalUrl = (max: number) =>
  z
    .union([z.literal(""), z.url({ protocol: /^https?$/, error: "Informe uma URL http(s) válida." }).max(max), z.null()])
    .transform((value) => (value === "" ? null : value))
    .optional();

export const externalSourceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  baseUrl: z.string().nullable(),
  workItemCount: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type ExternalSource = z.infer<typeof externalSourceSchema>;

export const createExternalSourceSchema = z
  .object({
    name: z.string().trim().min(2, "Informe ao menos 2 caracteres.").max(60, "Use no máximo 60 caracteres."),
    baseUrl: optionalUrl(500),
  })
  .strict();
export type CreateExternalSourceInput = z.input<typeof createExternalSourceSchema>;

export const updateExternalSourceSchema = createExternalSourceSchema.partial().extend({ version: versionSchema }).strict();
export type UpdateExternalSourceInput = z.input<typeof updateExternalSourceSchema>;

/* -------------------------------------------------------------------------- */
/* Itens externos (§13) + acompanhamento corrente (§14)                       */
/* -------------------------------------------------------------------------- */

const riskSignalSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  type: z.enum(["RISK", "IMPEDIMENT"]),
  severity: z.enum(riskSeverities),
  blockingLevel: z.enum(blockingLevels).nullable(),
});

export const trackingSchema = z.object({
  executingTeam: contextRefSchema.nullable(),
  developer: namedRefSchema.nullable(),
  committedDate: z.iso.date().nullable(),
  manualForecastDate: z.iso.date().nullable(),
  /** Avaliação manual do Tech Lead (§14.4). */
  manualHealth: z.enum(healthStatuses).nullable(),
  /** Derivada de dados explícitos; `null` quando a execução está encerrada. */
  calculatedHealth: z.enum(healthStatuses).nullable(),
  /** Manual quando houver, senão a calculada. */
  health: z.enum(healthStatuses).nullable(),
  remainingEffortHours: z.number().nullable(),
  lastCheckedAt: z.iso.datetime().nullable(),
  /** Sem verificação há mais de `TRACKING_STALE_DAYS` (§14.5). */
  stale: z.boolean(),
  statusSource: z.enum(statusSources).nullable(),
  statusNote: z.string().nullable(),
  updatedAt: z.iso.datetime(),
});
export type Tracking = z.infer<typeof trackingSchema>;

export const workItemSchema = z.object({
  id: z.uuid(),
  source: namedRefSchema,
  externalKey: z.string(),
  title: z.string(),
  externalUrl: z.string().nullable(),
  itemType: z.enum(workItemTypes),
  project: contextRefSchema,
  executionStatus: z.enum(executionStatuses),
  refinementStatus: z.enum(refinementStatuses),
  notes: z.string().nullable(),
  completedAt: z.iso.datetime().nullable(),
  tracking: trackingSchema,
  /** Associação corrente de sprint (RN-020). */
  currentSprint: z
    .object({
      id: z.uuid(),
      name: z.string(),
      status: z.enum(sprintStatuses),
      startDate: z.iso.date(),
      scopeType: z.enum(sprintScopeTypes),
    })
    .nullable(),
  /** Releases vigentes do item (RN-009). */
  releases: z.array(namedRefSchema.extend({ isRequired: z.boolean() })),
  openRisks: z.array(riskSignalSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type WorkItem = z.infer<typeof workItemSchema>;

/** Fotografia do acompanhamento após uma mudança relevante (RN-006, CA-006). */
export const trackingHistoryEntrySchema = z.object({
  id: z.uuid(),
  changedAt: z.iso.datetime(),
  changedFields: z.array(z.string()),
  executionStatus: z.enum(executionStatuses),
  refinementStatus: z.enum(refinementStatuses),
  executingTeam: contextRefSchema.nullable(),
  developer: namedRefSchema.nullable(),
  committedDate: z.iso.date().nullable(),
  manualForecastDate: z.iso.date().nullable(),
  healthStatus: z.enum(healthStatuses).nullable(),
  remainingEffortHours: z.number().nullable(),
  statusNote: z.string().nullable(),
});
export type TrackingHistoryEntry = z.infer<typeof trackingHistoryEntrySchema>;

export const sprintMovementSchema = z.object({
  id: z.uuid(),
  sprint: namedRefSchema.extend({ status: z.enum(sprintStatuses) }),
  scopeType: z.enum(sprintScopeTypes),
  enteredAt: z.iso.datetime(),
  exitedAt: z.iso.datetime().nullable(),
  exitReason: z.enum(sprintExitReasons).nullable(),
});
export type SprintMovement = z.infer<typeof sprintMovementSchema>;

/* Refinamento (§15) ---------------------------------------------------------- */

export const checkItemSchema = z.object({
  id: z.uuid(),
  label: z.string(),
  position: z.number().int(),
  checked: z.boolean(),
  checkedAt: z.iso.datetime().nullable(),
});
export type CheckItem = z.infer<typeof checkItemSchema>;

export const refinementSchema = z.object({
  status: z.enum(refinementStatuses),
  intendedSprint: namedRefSchema.extend({ status: z.enum(sprintStatuses), startDate: z.iso.date() }).nullable(),
  openQuestions: z.string().nullable(),
  pendingItems: z.string().nullable(),
  notes: z.string().nullable(),
  readyExceptionReason: z.string().nullable(),
  checkItems: z.array(checkItemSchema),
  checklist: z.object({ total: z.number().int(), checked: z.number().int() }),
  /** Checklist completo sugere "pronto"; nada é aplicado sem decisão (§15.5, §3.5). */
  suggestReady: z.boolean(),
  /** Não pronto para sprint iminente (§15.5). */
  notReadyForImminentSprint: z.boolean(),
  updatedAt: z.iso.datetime(),
});
export type Refinement = z.infer<typeof refinementSchema>;

export const workItemDetailSchema = workItemSchema.extend({
  refinement: refinementSchema,
  trackingHistory: z.array(trackingHistoryEntrySchema),
  sprintHistory: z.array(sprintMovementSchema),
  releaseHistory: z.array(
    z.object({
      id: z.uuid(),
      release: namedRefSchema,
      isRequired: z.boolean(),
      addedAt: z.iso.datetime(),
      removedAt: z.iso.datetime().nullable(),
    }),
  ),
  /** Atividades pessoais vinculadas (§6.8): concluir uma não resolve a outra. */
  tasks: z.array(z.object({ id: z.uuid(), title: z.string(), status: z.string() })),
});
export type WorkItemDetail = z.infer<typeof workItemDetailSchema>;

const titleSchema = z.string().trim().min(2, "Informe ao menos 2 caracteres.").max(300, "Use no máximo 300 caracteres.");
const externalKeySchema = z
  .string()
  .trim()
  .min(1, "Informe o identificador externo.")
  .max(60, "Use no máximo 60 caracteres.");
const optionalUuid = z.union([z.literal(""), z.uuid(), z.null()]).transform((v) => (v === "" ? null : v)).optional();

/** Campos de acompanhamento editáveis (§14.2). Atualizar registra a verificação. */
const trackingFields = {
  executingTeamId: optionalUuid,
  developerId: optionalUuid,
  committedDate: optionalIsoDate,
  manualForecastDate: optionalIsoDate,
  manualHealth: z.enum(healthStatuses).nullable().optional(),
  remainingEffortHours: optionalHours,
  statusSource: z.enum(statusSources).nullable().optional(),
  statusNote: optionalText(1000),
};

export const createWorkItemSchema = z
  .object({
    sourceId: z.uuid("Selecione a origem."),
    externalKey: externalKeySchema,
    title: titleSchema,
    externalUrl: optionalUrl(2000),
    itemType: z.enum(workItemTypes).default("STORY"),
    projectId: z.uuid("Selecione o projeto de referência (RN-018)."),
    executionStatus: z.enum(executionStatuses).default("NOT_STARTED"),
    notes: optionalText(5000),
    ...trackingFields,
  })
  .strict();
export type CreateWorkItemInput = z.input<typeof createWorkItemSchema>;

export const updateWorkItemSchema = z
  .object({
    sourceId: z.uuid().optional(),
    externalKey: externalKeySchema.optional(),
    title: titleSchema.optional(),
    externalUrl: optionalUrl(2000),
    itemType: z.enum(workItemTypes).optional(),
    projectId: z.uuid().optional(),
    executionStatus: z.enum(executionStatuses).optional(),
    notes: optionalText(5000),
    ...trackingFields,
    version: versionSchema,
  })
  .strict();
export type UpdateWorkItemInput = z.input<typeof updateWorkItemSchema>;

export const workItemScopes = ["open", "closed", "all"] as const;

/** Entregas por time, projeto, desenvolvedor, sprint ou release (§14.2, RNF-009). */
export const workItemListQuerySchema = paginationQuerySchema.extend({
  scope: z.enum(workItemScopes).default("open"),
  teamId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  developerId: z.uuid().optional(),
  sprintId: z.uuid().optional(),
  releaseId: z.uuid().optional(),
  health: z.enum(healthStatuses).optional(),
  stale: queryFlag,
  q: z.string().trim().max(100).optional(),
});
export type WorkItemListQuery = z.input<typeof workItemListQuerySchema>;

export const updateRefinementSchema = z
  .object({
    status: z.enum(refinementStatuses).optional(),
    intendedSprintId: optionalUuid,
    openQuestions: optionalText(2000),
    pendingItems: optionalText(2000),
    notes: optionalText(2000),
    readyExceptionReason: optionalText(1000),
    /** Versão do item externo (raiz do agregado). */
    version: versionSchema,
  })
  .strict();
export type UpdateRefinementInput = z.input<typeof updateRefinementSchema>;

export const createCheckItemSchema = z
  .object({ label: z.string().trim().min(2, "Informe ao menos 2 caracteres.").max(120, "Use no máximo 120 caracteres.") })
  .strict();
export type CreateCheckItemInput = z.input<typeof createCheckItemSchema>;

export const updateCheckItemSchema = z.object({ checked: z.boolean() }).strict();
export type UpdateCheckItemInput = z.input<typeof updateCheckItemSchema>;

/** Pipeline de refinamento (§15.2): itens com execução aberta, filtráveis por time e projeto. */
export const refinementListQuerySchema = z.object({
  teamId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  sprintId: z.uuid().optional(),
});
export type RefinementListQuery = z.input<typeof refinementListQuerySchema>;

export const refinementPipelineItemSchema = z.object({
  workItem: workItemSchema,
  intendedSprint: refinementSchema.shape.intendedSprint,
  checklist: refinementSchema.shape.checklist,
  openQuestions: z.string().nullable(),
  suggestReady: z.boolean(),
  notReadyForImminentSprint: z.boolean(),
});
export type RefinementPipelineItem = z.infer<typeof refinementPipelineItemSchema>;

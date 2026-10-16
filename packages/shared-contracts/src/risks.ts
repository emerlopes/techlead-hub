import { z } from "zod";
import {
  contextRefSchema,
  historyEntrySchema,
  namedRefSchema,
  optionalIsoDate,
  optionalText,
  uuidListSchema,
  versionSchema,
  workItemRefSchema,
} from "./common";
import { blockingLevels, riskSeverities } from "./delivery-rules";

/* -------------------------------------------------------------------------- */
/* Riscos e impedimentos (§16)                                                */
/* -------------------------------------------------------------------------- */

export const riskTypes = ["RISK", "IMPEDIMENT"] as const;
export const riskProbabilities = ["LOW", "MEDIUM", "HIGH"] as const;
export const riskStatuses = ["OPEN", "MONITORING", "RESOLVED", "CANCELLED"] as const;
/** Abertos = afetam a saúde das entregas. Resolvidos continuam consultáveis (RN-008). */
export const OPEN_RISK_STATUSES = ["OPEN", "MONITORING"] as const;

export type RiskTypeValue = (typeof riskTypes)[number];
export type RiskStatusValue = (typeof riskStatuses)[number];

/** Contextos afetados: um risco pode afetar várias entregas e projetos (§16.4). */
export const riskLinksSchema = z.object({
  workItems: z.array(workItemRefSchema),
  sprints: z.array(namedRefSchema),
  releases: z.array(namedRefSchema),
  projects: z.array(contextRefSchema),
  teams: z.array(contextRefSchema),
  tasks: z.array(z.object({ id: z.uuid(), title: z.string() })),
});
export type RiskLinks = z.infer<typeof riskLinksSchema>;

export const riskSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(riskTypes),
  severity: z.enum(riskSeverities),
  probability: z.enum(riskProbabilities).nullable(),
  impact: z.string().nullable(),
  blockingLevel: z.enum(blockingLevels).nullable(),
  status: z.enum(riskStatuses),
  mitigationPlan: z.string().nullable(),
  owner: z.string().nullable(),
  identifiedAt: z.iso.date(),
  resolvedAt: z.iso.datetime().nullable(),
  resolutionNote: z.string().nullable(),
  links: riskLinksSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type Risk = z.infer<typeof riskSchema>;

export const riskDetailSchema = riskSchema.extend({ history: z.array(historyEntrySchema) });
export type RiskDetail = z.infer<typeof riskDetailSchema>;

/** Vínculos substituídos por inteiro quando enviados. */
export const riskLinkInputSchema = z
  .object({
    workItemIds: uuidListSchema.optional(),
    sprintIds: uuidListSchema.optional(),
    releaseIds: uuidListSchema.optional(),
    projectIds: uuidListSchema.optional(),
    teamIds: uuidListSchema.optional(),
    taskIds: uuidListSchema.optional(),
  })
  .strict();
export type RiskLinkInput = z.input<typeof riskLinkInputSchema>;

const riskFields = {
  title: z.string().trim().min(2, "Informe ao menos 2 caracteres.").max(200, "Use no máximo 200 caracteres."),
  description: optionalText(5000),
  severity: z.enum(riskSeverities),
  probability: z.enum(riskProbabilities).nullable().optional(),
  impact: optionalText(1000),
  blockingLevel: z.enum(blockingLevels).nullable().optional(),
  mitigationPlan: optionalText(2000),
  owner: optionalText(120),
  identifiedAt: optionalIsoDate,
  links: riskLinkInputSchema.optional(),
};

export const createRiskSchema = z
  .object({ ...riskFields, type: z.enum(riskTypes).default("RISK"), severity: riskFields.severity.default("MEDIUM") })
  .strict()
  .refine((r) => r.type === "IMPEDIMENT" || !r.blockingLevel, {
    message: "Só impedimentos têm nível de bloqueio (§16.4).",
    path: ["blockingLevel"],
  });
export type CreateRiskInput = z.input<typeof createRiskSchema>;

export const updateRiskSchema = z
  .object({
    ...riskFields,
    title: riskFields.title.optional(),
    severity: riskFields.severity.optional(),
    type: z.enum(riskTypes).optional(),
    /** Resolver não conclui atividades ou entregas associadas (§16.4). */
    status: z.enum(riskStatuses).optional(),
    resolutionNote: optionalText(1000),
    version: versionSchema,
  })
  .strict();
export type UpdateRiskInput = z.input<typeof updateRiskSchema>;

export const riskScopes = ["open", "closed", "all"] as const;

export const riskListQuerySchema = z.object({
  scope: z.enum(riskScopes).default("open"),
  type: z.enum(riskTypes).optional(),
  teamId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  workItemId: z.uuid().optional(),
  sprintId: z.uuid().optional(),
  releaseId: z.uuid().optional(),
  taskId: z.uuid().optional(),
});
export type RiskListQuery = z.input<typeof riskListQuerySchema>;

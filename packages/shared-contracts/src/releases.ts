import { z } from "zod";
import { contextRefSchema, historyEntrySchema, optionalIsoDate, optionalText, versionSchema, workItemRefSchema } from "./common";
import { healthStatuses, sprintStatuses } from "./delivery-rules";
import { SPRINT_LENGTH_MAX, SPRINT_LENGTH_MIN } from "./sprint-calendar";
import { workItemSchema } from "./work-items";

/* -------------------------------------------------------------------------- */
/* Releases (§12)                                                             */
/* -------------------------------------------------------------------------- */

export const releaseStatuses = ["PLANNED", "IN_PROGRESS", "RELEASED", "CANCELLED"] as const;
export type ReleaseStatusValue = (typeof releaseStatuses)[number];

export const releaseProgressSchema = z.object({
  required: z.number().int(),
  requiredDone: z.number().int(),
  optional: z.number().int(),
  optionalDone: z.number().int(),
  /** Esforço restante dos obrigatórios em aberto que têm estimativa (§21); os demais contam à parte. */
  requiredRemainingHours: z.number(),
  requiredUnestimated: z.number().int(),
});
export type ReleaseProgress = z.infer<typeof releaseProgressSchema>;

export const releaseSchema = z.object({
  id: z.uuid(),
  project: contextRefSchema,
  name: z.string(),
  description: z.string().nullable(),
  /** Calendário de sprints definido no cadastro: início e duração em dias úteis. */
  startDate: z.iso.date().nullable(),
  sprintLengthDays: z.number().int().nullable(),
  /** Compromisso e previsão armazenados separadamente (§12.5). */
  committedDate: z.iso.date().nullable(),
  forecastDate: z.iso.date().nullable(),
  status: z.enum(releaseStatuses),
  closedAt: z.iso.datetime().nullable(),
  /** Calculada a partir de datas, itens obrigatórios e riscos; `null` quando encerrada. */
  health: z.enum(healthStatuses).nullable(),
  progress: releaseProgressSchema,
  /** Times executores dos itens vigentes (CA-008); a release conta uma vez (§12.5). */
  teams: z.array(contextRefSchema),
  openRiskCount: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type Release = z.infer<typeof releaseSchema>;

export const releaseItemSchema = z.object({
  membershipId: z.uuid(),
  isRequired: z.boolean(),
  addedAt: z.iso.datetime(),
  workItem: workItemSchema,
});
export type ReleaseItem = z.infer<typeof releaseItemSchema>;

export const milestoneSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  targetDate: z.iso.date().nullable(),
  completedAt: z.iso.datetime().nullable(),
});
export type Milestone = z.infer<typeof milestoneSchema>;

export const releaseDetailSchema = releaseSchema.extend({
  items: z.array(releaseItemSchema),
  /** Itens que saíram do escopo, preservados no histórico. */
  removed: z.array(
    z.object({
      membershipId: z.uuid(),
      isRequired: z.boolean(),
      addedAt: z.iso.datetime(),
      removedAt: z.iso.datetime(),
      workItem: workItemRefSchema,
    }),
  ),
  milestones: z.array(milestoneSchema),
  /** Sprints geradas no cadastro para os times do projeto. */
  generatedSprints: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      team: contextRefSchema,
      startDate: z.iso.date(),
      endDate: z.iso.date(),
      status: z.enum(sprintStatuses),
    }),
  ),
  /** Evolução de compromisso e previsão (§12.5). */
  forecastHistory: z.array(
    z.object({
      id: z.uuid(),
      changedAt: z.iso.datetime(),
      committedDate: z.iso.date().nullable(),
      forecastDate: z.iso.date().nullable(),
    }),
  ),
  history: z.array(historyEntrySchema),
});
export type ReleaseDetail = z.infer<typeof releaseDetailSchema>;

const releaseNameSchema = z.string().trim().min(2, "Informe ao menos 2 caracteres.").max(80, "Use no máximo 80 caracteres.");

export const createReleaseSchema = z
  .object({
    projectId: z.uuid("Selecione o projeto (RN-017)."),
    name: releaseNameSchema,
    description: optionalText(2000),
    committedDate: optionalIsoDate,
    forecastDate: optionalIsoDate,
    /** Início do calendário de sprints; hoje (fuso do workspace) quando omitido. */
    startDate: optionalIsoDate,
    /** Gera sprints planejadas de N dias úteis para cada time do projeto até o prazo comprometido. */
    sprintLengthDays: z
      .number({ error: "Informe um número inteiro de dias." })
      .int("Informe um número inteiro de dias.")
      .min(SPRINT_LENGTH_MIN, `Use ao menos ${SPRINT_LENGTH_MIN} dia útil.`)
      .max(SPRINT_LENGTH_MAX, `Use no máximo ${SPRINT_LENGTH_MAX} dias úteis.`)
      .nullable()
      .optional(),
  })
  .strict()
  .refine((r) => !r.sprintLengthDays || Boolean(r.committedDate), {
    message: "Informe o prazo comprometido para gerar as sprints.",
    path: ["committedDate"],
  })
  .refine((r) => !r.startDate || !r.committedDate || r.startDate <= r.committedDate, {
    message: "O início não pode ser depois do prazo comprometido.",
    path: ["startDate"],
  });
export type CreateReleaseInput = z.input<typeof createReleaseSchema>;

/** Resultado da geração de sprints no cadastro (exibido uma vez após criar). */
export const sprintGenerationSchema = z.object({
  created: z.number().int(),
  skipped: z.number().int(),
  teams: z.number().int(),
});
export type SprintGeneration = z.infer<typeof sprintGenerationSchema>;

/** `POST /releases` devolve o detalhe + o resumo da geração (`null` sem duração de sprint). */
export const createReleaseResultSchema = releaseDetailSchema.extend({ sprintGeneration: sprintGenerationSchema.nullable() });
export type CreateReleaseResult = z.infer<typeof createReleaseResultSchema>;

export const updateReleaseSchema = z
  .object({
    name: releaseNameSchema.optional(),
    description: optionalText(2000),
    committedDate: optionalIsoDate,
    forecastDate: optionalIsoDate,
    /** Encerrar = `RELEASED` ou `CANCELLED` (§12.2). */
    status: z.enum(releaseStatuses).optional(),
    version: versionSchema,
  })
  .strict();
export type UpdateReleaseInput = z.input<typeof updateReleaseSchema>;

export const releaseListQuerySchema = z.object({
  status: z.enum(releaseStatuses).optional(),
  projectId: z.uuid().optional(),
  teamId: z.uuid().optional(),
});
export type ReleaseListQuery = z.input<typeof releaseListQuerySchema>;

export const addReleaseItemSchema = z
  .object({ workItemId: z.uuid("Selecione um item."), isRequired: z.boolean().default(true) })
  .strict();
export type AddReleaseItemInput = z.input<typeof addReleaseItemSchema>;

export const updateReleaseItemSchema = z.object({ isRequired: z.boolean() }).strict();
export type UpdateReleaseItemInput = z.input<typeof updateReleaseItemSchema>;

export const createMilestoneSchema = z
  .object({
    name: z.string().trim().min(2, "Informe ao menos 2 caracteres.").max(120, "Use no máximo 120 caracteres."),
    targetDate: optionalIsoDate,
  })
  .strict();
export type CreateMilestoneInput = z.input<typeof createMilestoneSchema>;

export const updateMilestoneSchema = createMilestoneSchema
  .partial()
  .extend({ completed: z.boolean().optional() })
  .strict();
export type UpdateMilestoneInput = z.input<typeof updateMilestoneSchema>;

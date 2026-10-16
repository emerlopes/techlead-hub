import { z } from "zod";
import {
  contextRefSchema,
  namedRefSchema,
  optionalIsoDate,
  paginationQuerySchema,
  uuidListSchema,
  versionSchema,
  workItemRefSchema,
} from "./common";

/* -------------------------------------------------------------------------- */
/* Diário de bordo (§17)                                                      */
/* -------------------------------------------------------------------------- */

export const journalCategories = [
  "TECH_DECISION",
  "INCIDENT",
  "BLOCK",
  "UNBLOCK",
  "LEARNING",
  "SCOPE_CHANGE",
  "ACHIEVEMENT",
  "RISK",
  "GENERAL",
] as const;
export type JournalCategoryValue = (typeof journalCategories)[number];

/** Um acontecimento pode estar relacionado a vários contextos (§17.4). */
export const journalLinksSchema = z.object({
  teams: z.array(contextRefSchema),
  projects: z.array(contextRefSchema),
  sprints: z.array(namedRefSchema),
  releases: z.array(namedRefSchema),
  workItems: z.array(workItemRefSchema),
  risks: z.array(z.object({ id: z.uuid(), title: z.string() })),
});
export type JournalLinks = z.infer<typeof journalLinksSchema>;

export const journalEntrySchema = z.object({
  id: z.uuid(),
  category: z.enum(journalCategories),
  description: z.string(),
  occurredOn: z.iso.date(),
  links: journalLinksSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;

export const journalLinkInputSchema = z
  .object({
    teamIds: uuidListSchema.optional(),
    projectIds: uuidListSchema.optional(),
    sprintIds: uuidListSchema.optional(),
    releaseIds: uuidListSchema.optional(),
    workItemIds: uuidListSchema.optional(),
    riskIds: uuidListSchema.optional(),
  })
  .strict();
export type JournalLinkInput = z.input<typeof journalLinkInputSchema>;

const descriptionSchema = z
  .string()
  .trim()
  .min(3, "Descreva o acontecimento (§17.4).")
  .max(5000, "Use no máximo 5000 caracteres.");

export const createJournalEntrySchema = z
  .object({
    category: z.enum(journalCategories, "Selecione a categoria (§17.4)."),
    description: descriptionSchema,
    /** Hoje no fuso do workspace quando omitida (§17.4). */
    occurredOn: optionalIsoDate,
    links: journalLinkInputSchema.optional(),
  })
  .strict();
export type CreateJournalEntryInput = z.input<typeof createJournalEntrySchema>;

export const updateJournalEntrySchema = z
  .object({
    category: z.enum(journalCategories).optional(),
    description: descriptionSchema.optional(),
    occurredOn: z.iso.date("Informe uma data válida.").optional(),
    links: journalLinkInputSchema.optional(),
    version: versionSchema,
  })
  .strict();
export type UpdateJournalEntryInput = z.input<typeof updateJournalEntrySchema>;

/** Linha do tempo filtrável (§17.3). Time/projeto incluem sprints, releases e itens deles. */
export const journalListQuerySchema = paginationQuerySchema.extend({
  category: z.enum(journalCategories).optional(),
  teamId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  sprintId: z.uuid().optional(),
  releaseId: z.uuid().optional(),
  workItemId: z.uuid().optional(),
  riskId: z.uuid().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
export type JournalListQuery = z.input<typeof journalListQuerySchema>;

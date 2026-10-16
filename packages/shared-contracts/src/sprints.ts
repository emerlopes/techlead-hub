import { z } from "zod";
import { contextRefSchema, historyEntrySchema, optionalText, versionSchema } from "./common";
import { sprintStatuses } from "./delivery-rules";
import { sprintExitReasons, sprintScopeTypes, workItemSchema } from "./work-items";

/* -------------------------------------------------------------------------- */
/* Sprints (§11)                                                              */
/* -------------------------------------------------------------------------- */

export const sprintCountsSchema = z.object({
  /** Itens no escopo vigente (ou no escopo do encerramento). */
  total: z.number().int(),
  done: z.number().int(),
  blocked: z.number().int(),
  openRisks: z.number().int(),
});

export const sprintSchema = z.object({
  id: z.uuid(),
  team: contextRefSchema,
  name: z.string(),
  goal: z.string().nullable(),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  status: z.enum(sprintStatuses),
  closedAt: z.iso.datetime().nullable(),
  counts: sprintCountsSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type Sprint = z.infer<typeof sprintSchema>;

export const sprintItemSchema = z.object({
  membershipId: z.uuid(),
  scopeType: z.enum(sprintScopeTypes),
  enteredAt: z.iso.datetime(),
  exitedAt: z.iso.datetime().nullable(),
  exitReason: z.enum(sprintExitReasons).nullable(),
  workItem: workItemSchema,
});
export type SprintItem = z.infer<typeof sprintItemSchema>;

/** Resumo para retrospectiva (§11.2): movimentações de escopo e resultado, sem inventar dados. */
export const sprintSummarySchema = z.object({
  original: z.number().int(),
  added: z.number().int(),
  movedIn: z.number().int(),
  removed: z.number().int(),
  movedOut: z.number().int(),
  completed: z.number().int(),
  pending: z.number().int(),
});
export type SprintSummary = z.infer<typeof sprintSummarySchema>;

export const sprintDetailSchema = sprintSchema.extend({
  /** Escopo vigente; após o encerramento, o escopo no momento do fechamento. */
  items: z.array(sprintItemSchema),
  /** Itens que saíram durante a sprint (removidos ou remanejados), preservados (RN-010). */
  departed: z.array(sprintItemSchema),
  summary: sprintSummarySchema,
  history: z.array(historyEntrySchema),
});
export type SprintDetail = z.infer<typeof sprintDetailSchema>;

const sprintNameSchema = z.string().trim().min(2, "Informe ao menos 2 caracteres.").max(80, "Use no máximo 80 caracteres.");
const businessDate = z.iso.date("Informe uma data válida.");

export const createSprintSchema = z
  .object({
    teamId: z.uuid("Selecione o time responsável (RN-016)."),
    name: sprintNameSchema,
    goal: optionalText(1000),
    startDate: businessDate,
    endDate: businessDate,
  })
  .strict()
  .refine((s) => s.endDate >= s.startDate, { message: "O fim não pode ser antes do início.", path: ["endDate"] });
export type CreateSprintInput = z.input<typeof createSprintSchema>;

export const updateSprintSchema = z
  .object({
    name: sprintNameSchema.optional(),
    goal: optionalText(1000),
    startDate: businessDate.optional(),
    endDate: businessDate.optional(),
    /** Iniciar ou cancelar. Encerrar usa `POST /sprints/{id}/close`. */
    status: z.enum(["PLANNED", "ACTIVE", "CANCELLED"]).optional(),
    version: versionSchema,
  })
  .strict();
export type UpdateSprintInput = z.input<typeof updateSprintSchema>;

export const closeSprintSchema = z.object({ version: versionSchema }).strict();
export type CloseSprintInput = z.input<typeof closeSprintSchema>;

export const sprintListQuerySchema = z.object({
  status: z.enum(sprintStatuses).optional(),
  teamId: z.uuid().optional(),
  projectId: z.uuid().optional(),
});
export type SprintListQuery = z.input<typeof sprintListQuerySchema>;

/** Planejar item na sprint. `move` remaneja da sprint corrente, preservando o histórico (CA-007). */
export const addSprintItemSchema = z
  .object({ workItemId: z.uuid("Selecione um item."), move: z.boolean().default(false) })
  .strict();
export type AddSprintItemInput = z.input<typeof addSprintItemSchema>;

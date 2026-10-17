import { z } from "zod";
import { allocationSchema } from "./capacity";
import { CAPACITY_MAX_DAYS, daysInRange } from "./capacity-rules";
import { blockingLevels, executionStatuses } from "./delivery-rules";
import { contextRefSchema, historyEntrySchema, namedRefSchema, optionalIsoDate, optionalText, versionSchema } from "./common";
import {
  DEFAULT_EXECUTION_MODE,
  DEFAULT_PARALLEL_ITEMS,
  DEFAULT_REDISTRIBUTION_POLICY,
  dependencyStates,
  dependencyStatuses,
  dependencyTypes,
  type ExecutionModeValue,
  executionModes,
  executionPlanStatuses,
  PLAN_ITEMS_LIMIT,
  planIssueTypes,
  planItemStates,
  planShapeIssues,
  redistributionPolicies,
} from "./planning-rules";

const optionalUuid = z.union([z.literal(""), z.uuid(), z.null()]).transform((v) => (v === "" ? null : v)).optional();

/* -------------------------------------------------------------------------- */
/* Planos de execução (§22.3, §22.4, §36.11)                                  */
/* -------------------------------------------------------------------------- */

/** Item da fila como o plano o enxerga: execução, esforço restante e bloqueio correntes. */
export const planWorkItemSchema = z.object({
  id: z.uuid(),
  externalKey: z.string(),
  title: z.string(),
  executionStatus: z.enum(executionStatuses),
  project: contextRefSchema,
  /** Responsável no acompanhamento (§14.3). */
  developer: namedRefSchema.nullable(),
  remainingHours: z.number().nullable(),
  /** Impedimento aberto mais forte (§16.4). */
  blocking: z.enum(blockingLevels).nullable(),
});
export type PlanWorkItem = z.infer<typeof planWorkItemSchema>;

export const itemProjectionSchema = z.object({
  state: z.enum(planItemStates),
  startDate: z.iso.date().nullable(),
  finishDate: z.iso.date().nullable(),
  plannedHours: z.number(),
  redistributedHours: z.number(),
  remainingAtEnd: z.number().nullable(),
  hoursByDay: z.array(z.number()),
});
export type ItemProjectionDto = z.infer<typeof itemProjectionSchema>;

/** Restrição de início do item: dependência e a situação dela no cálculo (§24.4). */
export const planItemConstraintSchema = z.object({
  dependencyId: z.uuid(),
  type: z.enum(dependencyTypes),
  state: z.enum(dependencyStates),
  predecessor: z.object({ id: z.uuid(), externalKey: z.string(), title: z.string() }).nullable(),
  externalReference: z.string().nullable(),
  expectedReleaseDate: z.iso.date().nullable(),
});
export type PlanItemConstraint = z.infer<typeof planItemConstraintSchema>;

export const planItemSchema = z.object({
  id: z.uuid(),
  position: z.number().int(),
  workItem: planWorkItemSchema,
  /** Parcela da capacidade do contexto (0–1); vazia = divide o restante. */
  capacityShare: z.number().nullable(),
  earliestStartDate: z.iso.date().nullable(),
  notes: z.string().nullable(),
  constraints: z.array(planItemConstraintSchema),
  /** `null` em planos arquivados. */
  projection: itemProjectionSchema.nullable(),
});
export type PlanItem = z.infer<typeof planItemSchema>;

export const planProjectionSchema = z.object({
  days: z.array(z.iso.date()),
  capacityByDay: z.array(z.number()),
  usedByDay: z.array(z.number()),
  capacityHours: z.number(),
  plannedHours: z.number(),
  idleHours: z.number(),
  receivedHours: z.number(),
  donatedHours: z.number(),
  complete: z.boolean(),
});
export type PlanProjectionDto = z.infer<typeof planProjectionSchema>;

export const planIssueSchema = z.object({ type: z.enum(planIssueTypes), itemIds: z.array(z.uuid()) });
export type PlanIssue = z.infer<typeof planIssueSchema>;

export const executionPlanSchema = z.object({
  id: z.uuid(),
  developer: namedRefSchema,
  /** Contexto do plano: as alocações com exatamente este time e projeto alimentam a fila. */
  team: contextRefSchema.nullable(),
  project: contextRefSchema.nullable(),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  executionMode: z.enum(executionModes),
  maxParallelItems: z.number().int(),
  redistributionPolicy: z.enum(redistributionPolicies),
  status: z.enum(executionPlanStatuses),
  notes: z.string().nullable(),
  itemCount: z.number().int(),
  openItemCount: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type ExecutionPlan = z.infer<typeof executionPlanSchema>;

export const executionPlanDetailSchema = executionPlanSchema.extend({
  items: z.array(planItemSchema),
  /** Projeção de hoje até o fim do plano; `null` em planos arquivados ou já encerrados. */
  projection: planProjectionSchema.nullable(),
  issues: z.array(planIssueSchema),
  /** Alocações da pessoa que alimentam o contexto, com as horas no período projetado. */
  contextAllocations: z.array(z.object({ allocation: allocationSchema, hours: z.number() })),
  history: z.array(historyEntrySchema),
});
export type ExecutionPlanDetail = z.infer<typeof executionPlanDetailSchema>;

/** Sequencial executa um item por vez; o híbrido sugere dois (§37). */
export function defaultMaxParallel(mode: ExecutionModeValue, itemCount = 0): number {
  if (mode === "SEQUENTIAL") return 1;
  if (mode === "PARALLEL") return Math.max(DEFAULT_PARALLEL_ITEMS, itemCount);
  return DEFAULT_PARALLEL_ITEMS;
}

const shareSchema = z
  .number({ error: "Informe um número válido." })
  .gt(0, "A parcela fica entre 1% e 100%.")
  .max(1, "A parcela fica entre 1% e 100%.");

export const planItemInputSchema = z
  .object({
    workItemId: z.uuid("Selecione o item."),
    /** Ordem explícita (§22.5); sem posição vale a ordem da lista. */
    position: z.number().int().min(1).optional(),
    capacityShare: shareSchema.nullable().optional(),
    earliestStartDate: optionalIsoDate,
    notes: optionalText(500),
  })
  .strict();
export type PlanItemInput = z.input<typeof planItemInputSchema>;

const itemsSchema = z
  .array(planItemInputSchema)
  .max(PLAN_ITEMS_LIMIT, `Use no máximo ${PLAN_ITEMS_LIMIT} itens por plano.`)
  // Posição explícita primeiro; a lista é a ordem de desempate.
  .transform((items) =>
    items
      .map((item, index) => ({ item, key: item.position ?? index + 1, index }))
      .sort((a, b) => a.key - b.key || a.index - b.index)
      .map(({ item }) => item),
  );

const periodInputSchema = z
  .object({ startDate: z.iso.date("Informe o início."), endDate: z.iso.date("Informe o fim.") })
  .strict()
  .refine((p) => p.endDate >= p.startDate, { message: "O fim não pode ser anterior ao início (§35.7).", path: ["endDate"] })
  .refine((p) => p.endDate < p.startDate || daysInRange(p.startDate, p.endDate) <= CAPACITY_MAX_DAYS, {
    message: `Use um período de até ${CAPACITY_MAX_DAYS} dias (§25.6).`,
    path: ["endDate"],
  });

/** Plano novo nasce ativo; rascunhos servem para comparar alternativas sem afetar a capacidade. */
export const creatableStatuses = ["DRAFT", "ACTIVE"] as const;

/** `POST /execution-plans` (§37). */
export const createExecutionPlanSchema = z
  .object({
    developerId: z.uuid("Selecione a pessoa."),
    teamId: optionalUuid,
    projectId: optionalUuid,
    period: periodInputSchema,
    executionMode: z.enum(executionModes).default(DEFAULT_EXECUTION_MODE),
    maxParallelItems: z.number({ error: "Informe um número válido." }).int().optional(),
    redistributionPolicy: z.enum(redistributionPolicies).default(DEFAULT_REDISTRIBUTION_POLICY),
    status: z.enum(creatableStatuses).default("ACTIVE"),
    notes: optionalText(1000),
    items: itemsSchema.default([]),
  })
  .strict()
  .transform((plan) => ({ ...plan, maxParallelItems: plan.maxParallelItems ?? defaultMaxParallel(plan.executionMode, plan.items.length) }))
  .superRefine((plan, ctx) => {
    for (const issue of planShapeIssues(plan)) ctx.addIssue({ code: "custom", message: issue.message, path: issue.path.split(".") });
  });
export type CreateExecutionPlanInput = z.input<typeof createExecutionPlanSchema>;

/** `PATCH /execution-plans/{id}`: campos enviados substituem os atuais; `items` substitui a fila inteira. */
export const updateExecutionPlanSchema = z
  .object({
    teamId: optionalUuid,
    projectId: optionalUuid,
    period: periodInputSchema.optional(),
    executionMode: z.enum(executionModes).optional(),
    maxParallelItems: z.number({ error: "Informe um número válido." }).int().optional(),
    redistributionPolicy: z.enum(redistributionPolicies).optional(),
    status: z.enum(executionPlanStatuses).optional(),
    notes: optionalText(1000),
    items: itemsSchema.optional(),
    version: versionSchema,
  })
  .strict();
export type UpdateExecutionPlanInput = z.input<typeof updateExecutionPlanSchema>;

export const planScopes = ["current", "archived", "all"] as const;

export const planListQuerySchema = z.object({
  developerId: z.uuid().optional(),
  teamId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  /** Planos que contêm o item. */
  workItemId: z.uuid().optional(),
  /** `current` = rascunhos e ativos. */
  scope: z.enum(planScopes).default("current"),
});
export type PlanListQuery = z.input<typeof planListQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Dependências (§24, §36.12)                                                 */
/* -------------------------------------------------------------------------- */

export const dependencyItemSchema = z.object({
  id: z.uuid(),
  externalKey: z.string(),
  title: z.string(),
  executionStatus: z.enum(executionStatuses),
  project: contextRefSchema,
});
export type DependencyItem = z.infer<typeof dependencyItemSchema>;

export const workDependencySchema = z.object({
  id: z.uuid(),
  dependencyType: z.enum(dependencyTypes),
  /** `null` na dependência externa. */
  predecessor: dependencyItemSchema.nullable(),
  successor: dependencyItemSchema,
  externalReference: z.string().nullable(),
  expectedReleaseDate: z.iso.date().nullable(),
  actualReleaseDate: z.iso.date().nullable(),
  status: z.enum(dependencyStatuses),
  /** Situação no cálculo (§24.4). */
  state: z.enum(dependencyStates),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type WorkDependency = z.infer<typeof workDependencySchema>;

export const createWorkDependencySchema = z
  .object({
    dependencyType: z.enum(dependencyTypes),
    predecessorId: optionalUuid,
    successorId: z.uuid("Selecione o item que depende."),
    externalReference: optionalText(200),
    expectedReleaseDate: optionalIsoDate,
    notes: optionalText(1000),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.dependencyType === "EXTERNAL") {
      if (d.predecessorId) ctx.addIssue({ code: "custom", message: "Dependência externa não tem item predecessor.", path: ["predecessorId"] });
      if (!d.externalReference) {
        ctx.addIssue({ code: "custom", message: "Descreva de quem ou do que depende (ex.: API do parceiro).", path: ["externalReference"] });
      }
      return;
    }
    if (!d.predecessorId) ctx.addIssue({ code: "custom", message: "Selecione o item predecessor.", path: ["predecessorId"] });
    if (d.predecessorId && d.predecessorId === d.successorId) {
      ctx.addIssue({ code: "custom", message: "Uma entrega não pode depender de si mesma (§24.5).", path: ["predecessorId"] });
    }
    if (d.expectedReleaseDate) {
      ctx.addIssue({ code: "custom", message: "Data de liberação só vale para dependência externa.", path: ["expectedReleaseDate"] });
    }
  });
export type CreateWorkDependencyInput = z.input<typeof createWorkDependencySchema>;

export const updateWorkDependencySchema = z
  .object({
    externalReference: optionalText(200),
    expectedReleaseDate: optionalIsoDate,
    notes: optionalText(1000),
    version: versionSchema,
  })
  .strict();
export type UpdateWorkDependencyInput = z.input<typeof updateWorkDependencySchema>;

/** Liberação de dependência externa (§24.5): provoca recálculo — aqui, na próxima leitura. */
export const releaseWorkDependencySchema = z
  .object({ actualReleaseDate: z.iso.date().optional(), version: versionSchema })
  .strict();
export type ReleaseWorkDependencyInput = z.input<typeof releaseWorkDependencySchema>;

export const dependencyScopes = ["open", "all"] as const;

export const dependencyListQuerySchema = z.object({
  /** Dependências em que o item é predecessor ou sucessor. */
  workItemId: z.uuid().optional(),
  /** `open` = ainda não liberadas. */
  scope: z.enum(dependencyScopes).default("open"),
});
export type DependencyListQuery = z.input<typeof dependencyListQuerySchema>;

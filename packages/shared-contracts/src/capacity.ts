import { z } from "zod";
import {
  allocationPeriods,
  allocationTypes,
  availabilityExceptionTypes,
  CAPACITY_MAX_DAYS,
  capacityIssueTypes,
  capacityLevels,
  estimateConfidences,
  isValidCapacityRange,
} from "./capacity-rules";
import { contextRefSchema, namedRefSchema, optionalIsoDate, optionalText, versionSchema } from "./common";
import { developerStatuses } from "./organization";

/* -------------------------------------------------------------------------- */
/* Período das visões de capacidade (§25.6)                                   */
/* -------------------------------------------------------------------------- */

/** `?from&to` opcionais: sem eles vale hoje + `CAPACITY_DEFAULT_DAYS` no fuso do workspace. */
const rangeShape = { from: z.iso.date().optional(), to: z.iso.date().optional() };
const validRange = (q: { from?: string; to?: string }) => !q.from || !q.to || isValidCapacityRange(q.from, q.to);
const rangeMessage = { message: `Informe um período válido de até ${CAPACITY_MAX_DAYS} dias (§25.6).`, path: ["to"] };

export const capacityRangeQuerySchema = z.object(rangeShape).refine(validRange, rangeMessage);
export type CapacityRangeQuery = z.input<typeof capacityRangeQuerySchema>;

export const periodSchema = z.object({ from: z.iso.date(), to: z.iso.date() });
export type Period = z.infer<typeof periodSchema>;

const hours = (max: number, message = `Use no máximo ${max} horas.`) =>
  z.number({ error: "Informe um número válido." }).min(0, "Não pode ser negativo.").max(max, message);

/* -------------------------------------------------------------------------- */
/* Jornadas (§19.1)                                                           */
/* -------------------------------------------------------------------------- */

/** Rótulos curtos do padrão semanal, de segunda a domingo. */
export const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
/** Jornada sugerida ao cadastrar: 8 h de segunda a sexta. */
export const DEFAULT_WEEKLY_PATTERN = [8, 8, 8, 8, 8, 0, 0] as const;
/** Fator de foco sugerido (§18.2). Não representa produtividade (§18.4). */
export const DEFAULT_FOCUS_FACTOR = 0.75;

const weeklyPatternSchema = z
  .array(hours(24, "Use no máximo 24 horas por dia."))
  .length(7, "Informe as horas dos sete dias da semana.");
const focusFactorSchema = z
  .number({ error: "Informe um número válido." })
  .min(0, "O fator de foco fica entre 0% e 100%.")
  .max(1, "O fator de foco fica entre 0% e 100%.");

export const workScheduleSchema = z.object({
  id: z.uuid(),
  developer: namedRefSchema,
  validFrom: z.iso.date(),
  validUntil: z.iso.date().nullable(),
  timezone: z.string(),
  weeklyPattern: z.array(z.number()),
  /** Soma do padrão semanal (§19.1 `weekly_hours`). */
  weeklyHours: z.number(),
  focusFactor: z.number(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type WorkSchedule = z.infer<typeof workScheduleSchema>;

const periodRefine = <T extends { validFrom?: string | null; validUntil?: string | null }>(value: T) =>
  !value.validFrom || !value.validUntil || value.validUntil >= value.validFrom;
const periodMessage = { message: "O fim da vigência não pode ser anterior ao início (§35.7).", path: ["validUntil"] };

/** Uma nova jornada encerra a anterior no dia anterior ao início (histórico preservado, §19.4). */
export const createWorkScheduleSchema = z
  .object({
    developerId: z.uuid("Selecione a pessoa."),
    validFrom: z.iso.date("Informe o início da vigência."),
    validUntil: optionalIsoDate,
    timezone: z.string().trim().min(1).max(64).optional(),
    weeklyPattern: weeklyPatternSchema,
    focusFactor: focusFactorSchema.default(DEFAULT_FOCUS_FACTOR),
  })
  .strict()
  .refine(periodRefine, periodMessage);
export type CreateWorkScheduleInput = z.input<typeof createWorkScheduleSchema>;

export const updateWorkScheduleSchema = z
  .object({
    validFrom: z.iso.date().optional(),
    validUntil: optionalIsoDate,
    timezone: z.string().trim().min(1).max(64).optional(),
    weeklyPattern: weeklyPatternSchema.optional(),
    focusFactor: focusFactorSchema.optional(),
    version: versionSchema,
  })
  .strict()
  .refine(periodRefine, periodMessage);
export type UpdateWorkScheduleInput = z.input<typeof updateWorkScheduleSchema>;

export const scheduleListQuerySchema = z.object({ developerId: z.uuid().optional() });

/* -------------------------------------------------------------------------- */
/* Ausências e feriados (§19.2, §19.3)                                        */
/* -------------------------------------------------------------------------- */

export const availabilityExceptionSchema = z.object({
  id: z.uuid(),
  /** `null` = feriado do calendário do workspace, vale para todas as pessoas. */
  developer: namedRefSchema.nullable(),
  type: z.enum(availabilityExceptionTypes),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  /** Horas por dia; `null` = dia inteiro. */
  unavailableHours: z.number().nullable(),
  description: z.string().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type AvailabilityException = z.infer<typeof availabilityExceptionSchema>;

const unavailableHoursSchema = z
  .number({ error: "Informe um número válido." })
  .gt(0, "Informe mais que zero ou deixe vazio para o dia inteiro.")
  .max(24, "Use no máximo 24 horas por dia.")
  .nullable()
  .optional();

const exceptionFields = {
  type: z.enum(availabilityExceptionTypes),
  startDate: z.iso.date("Informe o início."),
  /** Vazio = mesmo dia do início. */
  endDate: optionalIsoDate,
  unavailableHours: unavailableHoursSchema,
  /** Motivo genérico: não registre informações pessoais sensíveis (§19.4). */
  description: optionalText(200),
};

export const createAvailabilityExceptionSchema = z
  .object({ developerId: z.uuid().nullable().optional(), ...exceptionFields })
  .strict()
  .refine((e) => !e.endDate || e.endDate >= e.startDate, { message: "O fim não pode ser anterior ao início.", path: ["endDate"] })
  .refine((e) => Boolean(e.developerId) || e.type === "HOLIDAY", {
    message: "Sem pessoa, só feriados do calendário do workspace.",
    path: ["developerId"],
  });
export type CreateAvailabilityExceptionInput = z.input<typeof createAvailabilityExceptionSchema>;

/** `POST /developers/{id}/availability-exceptions` (§36.5): a pessoa vem da rota. */
export const createDeveloperExceptionSchema = z
  .object(exceptionFields)
  .strict()
  .refine((e) => !e.endDate || e.endDate >= e.startDate, { message: "O fim não pode ser anterior ao início.", path: ["endDate"] });

export const updateAvailabilityExceptionSchema = z
  .object({
    type: exceptionFields.type.optional(),
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional(),
    unavailableHours: unavailableHoursSchema,
    description: exceptionFields.description,
    version: versionSchema,
  })
  .strict();
export type UpdateAvailabilityExceptionInput = z.input<typeof updateAvailabilityExceptionSchema>;

export const exceptionScopes = ["upcoming", "all", "cancelled"] as const;

export const exceptionListQuerySchema = z.object({
  developerId: z.uuid().optional(),
  /** `upcoming` = não canceladas que terminam hoje ou depois. */
  scope: z.enum(exceptionScopes).default("upcoming"),
});
export type ExceptionListQuery = z.input<typeof exceptionListQuerySchema>;

export const cancelSchema = z.object({ version: versionSchema }).strict();

/* -------------------------------------------------------------------------- */
/* Alocações (§20)                                                            */
/* -------------------------------------------------------------------------- */

export const allocationSchema = z.object({
  id: z.uuid(),
  developer: namedRefSchema,
  /** Sem time e sem projeto = reserva geral (§20.5). */
  team: contextRefSchema.nullable(),
  project: contextRefSchema.nullable(),
  allocationType: z.enum(allocationTypes),
  /** Percentual entre 0 e 1 ou horas por `period`. */
  value: z.number(),
  period: z.enum(allocationPeriods).nullable(),
  validFrom: z.iso.date(),
  validUntil: z.iso.date().nullable(),
  description: z.string().nullable(),
  /** Vigente hoje. */
  active: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type Allocation = z.infer<typeof allocationSchema>;

export const allocationHistoryEntrySchema = z.object({
  id: z.uuid(),
  changedAt: z.iso.datetime(),
  changedFields: z.array(z.string()),
  team: contextRefSchema.nullable(),
  project: contextRefSchema.nullable(),
  allocationType: z.enum(allocationTypes),
  value: z.number(),
  period: z.enum(allocationPeriods).nullable(),
  validFrom: z.iso.date(),
  validUntil: z.iso.date().nullable(),
});
export type AllocationHistoryEntry = z.infer<typeof allocationHistoryEntrySchema>;

export const allocationDetailSchema = allocationSchema.extend({ history: z.array(allocationHistoryEntrySchema) });
export type AllocationDetail = z.infer<typeof allocationDetailSchema>;

const optionalUuid = z.union([z.literal(""), z.uuid(), z.null()]).transform((v) => (v === "" ? null : v)).optional();

/** Percentual entre 0 e 1 (§35.7) sem periodicidade; horas com periodicidade explícita (§20.3). */
export function allocationValueIssue(a: { allocationType?: string; value?: number; period?: string | null }): string | null {
  if (a.value === undefined) return null;
  if (a.allocationType === "PERCENTAGE" && (a.value <= 0 || a.value > 1)) return "O percentual fica entre 1% e 100%.";
  if (a.allocationType === "HOURS" && (a.value <= 0 || a.value > (a.period === "DAY" ? 24 : 168))) {
    return a.period === "DAY" ? "Use entre 0 e 24 horas por dia." : "Use entre 0 e 168 horas por semana.";
  }
  return null;
}

const allocationFields = {
  teamId: optionalUuid,
  projectId: optionalUuid,
  allocationType: z.enum(allocationTypes),
  value: z.number({ error: "Informe um número válido." }),
  period: z.enum(allocationPeriods).nullable().optional(),
  validFrom: optionalIsoDate,
  validUntil: optionalIsoDate,
  description: optionalText(300),
};

export const createAllocationSchema = z
  .object({ developerId: z.uuid("Selecione a pessoa."), ...allocationFields })
  .strict()
  .superRefine((a, ctx) => {
    const issue = allocationValueIssue(a);
    if (issue) ctx.addIssue({ code: "custom", message: issue, path: ["value"] });
    if (a.allocationType === "HOURS" && !a.period) {
      ctx.addIssue({ code: "custom", message: "Informe a periodicidade das horas (§20.3).", path: ["period"] });
    }
    if (!a.teamId && !a.projectId && !a.description) {
      ctx.addIssue({ code: "custom", message: "Descreva a reserva geral (ex.: suporte).", path: ["description"] });
    }
    if (a.validFrom && a.validUntil && a.validUntil < a.validFrom) ctx.addIssue({ code: "custom", ...periodMessage });
  });
export type CreateAllocationInput = z.input<typeof createAllocationSchema>;

/** Campos enviados substituem os atuais; a combinação final é validada na API. */
export const updateAllocationSchema = z
  .object({
    ...allocationFields,
    allocationType: allocationFields.allocationType.optional(),
    value: allocationFields.value.optional(),
    validFrom: z.iso.date().optional(),
    version: versionSchema,
  })
  .strict();
export type UpdateAllocationInput = z.input<typeof updateAllocationSchema>;

export const allocationScopes = ["current", "all"] as const;

export const allocationListQuerySchema = z.object({
  developerId: z.uuid().optional(),
  teamId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  /** `current` = vigentes hoje ou futuras. */
  scope: z.enum(allocationScopes).default("current"),
});
export type AllocationListQuery = z.input<typeof allocationListQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Capacidade calculada (§18, §25.5, §30.4)                                   */
/* -------------------------------------------------------------------------- */

export const capacitySummarySchema = z.object({
  days: z.number().int(),
  scheduledDays: z.number().int(),
  absenceDays: z.number().int(),
  nominalHours: z.number(),
  unavailableHours: z.number(),
  effectiveHours: z.number(),
  allocatedHours: z.number(),
  freeHours: z.number(),
  overAllocatedHours: z.number(),
  peakAllocationPercent: z.number(),
});
export type CapacitySummaryDto = z.infer<typeof capacitySummarySchema>;

export const capacityIssueSchema = z.object({
  type: z.enum(capacityIssueTypes),
  /** Alocações envolvidas (vazio quando a inconsistência é da pessoa toda). */
  allocationIds: z.array(z.uuid()),
});
export type CapacityIssue = z.infer<typeof capacityIssueSchema>;

export const developerCapacitySchema = z.object({
  developer: namedRefSchema.extend({ status: z.enum(developerStatuses) }),
  teams: z.array(contextRefSchema),
  summary: capacitySummarySchema,
  allocations: z.array(z.object({ allocation: allocationSchema, hours: z.number() })),
  issues: z.array(capacityIssueSchema),
});
export type DeveloperCapacity = z.infer<typeof developerCapacitySchema>;

export const capacityDaySchema = z.object({
  date: z.iso.date(),
  scheduled: z.boolean(),
  nominal: z.number(),
  unavailable: z.number(),
  effective: z.number(),
  allocated: z.number(),
});
export type CapacityDayDto = z.infer<typeof capacityDaySchema>;

export const developerCapacityDetailSchema = developerCapacitySchema.extend({
  period: periodSchema,
  days: z.array(capacityDaySchema),
  schedules: z.array(workScheduleSchema),
  /** Ausências e feriados que tocam o período. */
  exceptions: z.array(availabilityExceptionSchema),
});
export type DeveloperCapacityDetail = z.infer<typeof developerCapacityDetailSchema>;

export const demandSummarySchema = z.object({
  openItems: z.number().int(),
  estimatedItems: z.number().int(),
  unestimatedItems: z.number().int(),
  dueHours: z.number(),
  laterHours: z.number(),
  undatedHours: z.number(),
  totalHours: z.number(),
});
export type DemandSummaryDto = z.infer<typeof demandSummarySchema>;

/** Capacidade alocada × demanda de um contexto (§25.5). `utilization = null` quando CA = 0. */
export const contextLoadSchema = z.object({
  allocatedHours: z.number(),
  demand: demandSummarySchema,
  utilization: z.number().nullable(),
  level: z.enum(capacityLevels),
});
export type ContextLoad = z.infer<typeof contextLoadSchema>;

export const teamCapacitySchema = contextLoadSchema.extend({
  team: contextRefSchema,
  period: periodSchema,
  /** Pessoas com alocação no time ou participação ativa nele. */
  members: z.array(
    z.object({
      developer: namedRefSchema.extend({ status: z.enum(developerStatuses) }),
      isMember: z.boolean(),
      /** Parcela alocada ao time no período. */
      allocatedToTeamHours: z.number(),
      /** Capacidade global da pessoa (não somada ao time). */
      summary: capacitySummarySchema,
      issues: z.array(capacityIssueSchema),
    }),
  ),
  absences: z.array(availabilityExceptionSchema),
});
export type TeamCapacity = z.infer<typeof teamCapacitySchema>;

export const demandItemSchema = z.object({
  id: z.uuid(),
  externalKey: z.string(),
  title: z.string(),
  executingTeam: contextRefSchema.nullable(),
  developer: namedRefSchema.nullable(),
  remainingHours: z.number().nullable(),
  committedDate: z.iso.date().nullable(),
  confidence: z.enum(estimateConfidences).nullable(),
});
export type DemandItemDto = z.infer<typeof demandItemSchema>;

export const projectDemandSchema = contextLoadSchema.extend({
  project: contextRefSchema,
  period: periodSchema,
  /** Demanda por time executor; `team = null` = itens sem time. */
  byTeam: z.array(
    z.object({ team: contextRefSchema.nullable(), demand: demandSummarySchema, allocatedHours: z.number() }),
  ),
  /** Quem tem capacidade alocada ao projeto no período. */
  contributors: z.array(z.object({ developer: namedRefSchema, hours: z.number() })),
  items: z.array(demandItemSchema),
});
export type ProjectDemand = z.infer<typeof projectDemandSchema>;

export const capacityOverviewSchema = z.object({
  period: periodSchema,
  /** Somas das capacidades globais das pessoas: nenhuma hora é contada duas vezes (RN-037). */
  totals: capacitySummarySchema.pick({
    nominalHours: true,
    unavailableHours: true,
    effectiveHours: true,
    allocatedHours: true,
    freeHours: true,
    overAllocatedHours: true,
  }),
  developers: z.array(developerCapacitySchema),
  teams: z.array(contextLoadSchema.extend({ team: contextRefSchema })),
  projects: z.array(contextLoadSchema.extend({ project: contextRefSchema })),
  absences: z.array(availabilityExceptionSchema),
});
export type CapacityOverview = z.infer<typeof capacityOverviewSchema>;

export const capacityOverviewQuerySchema = z
  .object({ ...rangeShape, teamId: z.uuid().optional(), projectId: z.uuid().optional() })
  .refine(validRange, rangeMessage);
export type CapacityOverviewQuery = z.input<typeof capacityOverviewQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Estimativas (§21)                                                          */
/* -------------------------------------------------------------------------- */

export const effortEstimateSchema = z.object({
  id: z.uuid(),
  estimatedHours: z.number(),
  remainingHours: z.number(),
  confidence: z.enum(estimateConfidences),
  storyPoints: z.number().nullable(),
  actualHours: z.number().nullable(),
  reason: z.string().nullable(),
  estimatedAt: z.iso.datetime(),
});
export type EffortEstimate = z.infer<typeof effortEstimateSchema>;

/**
 * Nova estimativa ou revisão (RN-030): sempre uma linha nova. O esforço restante passa a valer no
 * acompanhamento; vazio = igual à estimativa.
 */
export const createEstimateSchema = z
  .object({
    estimatedHours: hours(9999),
    remainingHours: hours(9999).nullable().optional(),
    confidence: z.enum(estimateConfidences),
    /** Referência adicional; não é convertida em horas (§21.5). */
    storyPoints: z.number({ error: "Informe um número válido." }).min(0, "Não pode ser negativo.").max(999).nullable().optional(),
    actualHours: hours(9999).nullable().optional(),
    reason: optionalText(500),
    /** Versão do item externo (raiz do agregado). */
    version: versionSchema,
  })
  .strict();
export type CreateEstimateInput = z.input<typeof createEstimateSchema>;

/* -------------------------------------------------------------------------- */
/* Dashboard (§5.2.7)                                                         */
/* -------------------------------------------------------------------------- */

export const dashboardCapacitySchema = z.object({
  period: periodSchema,
  /** Times com demanda acima da capacidade alocada, ou demanda no período sem capacidade. */
  overloadedTeams: z.array(contextLoadSchema.extend({ team: contextRefSchema })),
  /** Pessoas com alocação acima da capacidade efetiva ou percentuais acima de 100% (CA-011). */
  overAllocatedDevelopers: z.array(developerCapacitySchema),
  /** Capacidade efetiva ainda não alocada, somada sem duplicar pessoas (RN-037). */
  unallocatedHours: z.number(),
  developersWithFreeCapacity: z.array(z.object({ developer: namedRefSchema, freeHours: z.number() })),
  /** Pessoas sobrealocadas entre dois ou mais projetos. */
  projectConflicts: z.array(
    z.object({ developer: namedRefSchema, projects: z.array(contextRefSchema), overAllocatedHours: z.number() }),
  ),
  /** Ausências no período de pessoas com alocação vigente. */
  absences: z.array(availabilityExceptionSchema),
  /** Pessoas ativas sem jornada: capacidade desconhecida (§3.4). */
  developersWithoutSchedule: z.number().int(),
});
export type DashboardCapacity = z.infer<typeof dashboardCapacitySchema>;

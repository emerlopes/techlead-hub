import { z } from "zod";
import {
  contextRefSchema,
  optionalHours,
  optionalIsoDate,
  optionalText,
  uuidListSchema,
  versionSchema,
} from "./common";

/* Tipos, situações e prioridades das atividades pessoais (§6.3–§6.5). */
export const taskTypes = [
  "TECHNICAL",
  "FOLLOW_UP",
  "DECISION",
  "MEETING",
  "PLANNING",
  "REVIEW",
  "INVESTIGATION",
  "OTHER",
] as const;
export const taskStatuses = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as const;
export const taskPriorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

/** Alerta de prazo, independente da ordem manual da fila de foco (§6.6). */
export const taskDueStates = ["OVERDUE", "DUE_TODAY", "DUE_SOON"] as const;

export type TaskType = (typeof taskTypes)[number];
export type TaskStatusValue = (typeof taskStatuses)[number];
export type TaskPriorityValue = (typeof taskPriorities)[number];
export type TaskDueState = (typeof taskDueStates)[number];

/** Limite da fila de foco (RN-003). */
export const FOCUS_QUEUE_LIMIT = 3;

export const taskFocusSchema = z.object({ position: z.number().int(), isPrimary: z.boolean() });

export const taskSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(taskTypes),
  status: z.enum(taskStatuses),
  priority: z.enum(taskPriorities),
  dueDate: z.iso.date().nullable(),
  nextAction: z.string().nullable(),
  blockedReason: z.string().nullable(),
  estimatedHours: z.number().nullable(),
  actualHours: z.number().nullable(),
  completedAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  /** Vínculos não duplicam a atividade (§6.8). */
  teams: z.array(contextRefSchema),
  projects: z.array(contextRefSchema),
  focus: taskFocusSchema.nullable(),
  /** Calculado no fuso do workspace; atividades encerradas nunca vencem (RN-001). */
  dueState: z.enum(taskDueStates).nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type Task = z.infer<typeof taskSchema>;

const taskFields = {
  title: z.string().trim().min(2, "Informe ao menos 2 caracteres.").max(200, "Use no máximo 200 caracteres."),
  description: optionalText(5000),
  type: z.enum(taskTypes),
  priority: z.enum(taskPriorities),
  dueDate: optionalIsoDate,
  nextAction: optionalText(300),
  blockedReason: optionalText(500),
  estimatedHours: optionalHours,
  actualHours: optionalHours,
  teamIds: uuidListSchema,
  projectIds: uuidListSchema,
};

export const createTaskSchema = z
  .object({
    ...taskFields,
    type: taskFields.type.default("OTHER"),
    priority: taskFields.priority.default("MEDIUM"),
    teamIds: taskFields.teamIds.default([]),
    projectIds: taskFields.projectIds.default([]),
  })
  .strict();
export type CreateTaskInput = z.input<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    ...taskFields,
    title: taskFields.title.optional(),
    type: taskFields.type.optional(),
    priority: taskFields.priority.optional(),
    /** Concluir e cancelar também tiram a atividade da fila de foco (§6.6). */
    status: z.enum(taskStatuses).optional(),
    teamIds: taskFields.teamIds.optional(),
    projectIds: taskFields.projectIds.optional(),
    version: versionSchema,
  })
  .strict();
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;

export const completeTaskSchema = z
  .object({ actualHours: optionalHours, version: versionSchema })
  .strict();
export type CompleteTaskInput = z.input<typeof completeTaskSchema>;

export const taskScopes = ["open", "closed", "all"] as const;

/** Filtros da listagem (§5.3, RNF-009). Contexto = time e/ou projeto. */
export const taskListQuerySchema = z.object({
  scope: z.enum(taskScopes).default("open"),
  teamId: z.uuid().optional(),
  projectId: z.uuid().optional(),
});
export type TaskListQuery = z.input<typeof taskListQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Fila de foco (§6.6)                                                        */
/* -------------------------------------------------------------------------- */

export const focusQueueSchema = z.object({
  items: z.array(z.object({ position: z.number().int(), isPrimary: z.boolean(), task: taskSchema })),
});
export type FocusQueue = z.infer<typeof focusQueueSchema>;

/** Substitui a fila inteira: a ordem de `taskIds` é a ordem manual. */
export const updateFocusQueueSchema = z
  .object({
    taskIds: z
      .array(z.uuid())
      .max(FOCUS_QUEUE_LIMIT, `A fila de foco aceita no máximo ${FOCUS_QUEUE_LIMIT} atividades (RN-003).`)
      .refine((ids) => new Set(ids).size === ids.length, "Atividade repetida na fila."),
    primaryTaskId: z.uuid().nullable(),
  })
  .strict()
  .refine((input) => input.primaryTaskId === null || input.taskIds.includes(input.primaryTaskId), {
    message: "O foco principal precisa estar na fila (RN-002).",
    path: ["primaryTaskId"],
  });
export type UpdateFocusQueueInput = z.infer<typeof updateFocusQueueSchema>;

/* -------------------------------------------------------------------------- */
/* Dashboard inicial (§5)                                                     */
/* -------------------------------------------------------------------------- */

export const dashboardQuerySchema = z.object({
  teamId: z.uuid().optional(),
  projectId: z.uuid().optional(),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const dashboardSchema = z.object({
  /** Data de referência no fuso do workspace. */
  today: z.iso.date(),
  context: z.object({ team: contextRefSchema.nullable(), project: contextRefSchema.nullable() }),
  /** A fila de foco é pessoal: não muda com o contexto (§5.4). */
  focus: focusQueueSchema,
  personal: z.object({
    openCount: z.number().int(),
    inProgressCount: z.number().int(),
    overdue: z.array(taskSchema),
    dueToday: z.array(taskSchema),
    upcoming: z.array(taskSchema),
    blocked: z.array(taskSchema),
  }),
  organization: z.object({
    activeTeams: z.number().int(),
    activeProjects: z.number().int(),
    activeDevelopers: z.number().int(),
  }),
});
export type Dashboard = z.infer<typeof dashboardSchema>;

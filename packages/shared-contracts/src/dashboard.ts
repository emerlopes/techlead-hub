import { z } from "zod";
import { contextRefSchema } from "./common";
import { releaseSchema } from "./releases";
import { sprintSchema } from "./sprints";
import { focusQueueSchema, taskSchema } from "./tasks";
import { refinementPipelineItemSchema, workItemSchema } from "./work-items";

/* -------------------------------------------------------------------------- */
/* Dashboard (§5)                                                             */
/* -------------------------------------------------------------------------- */

/** Cada lista do dashboard mostra até este número de itens; o total vem à parte. */
export const DASHBOARD_LIST_LIMIT = 8;

export const dashboardQuerySchema = z.object({
  teamId: z.uuid().optional(),
  projectId: z.uuid().optional(),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

const limitedList = <T extends z.ZodType>(item: T) => z.object({ total: z.number().int(), items: z.array(item) });

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
  /**
   * Entregas críticas (§5.2.3). Cada item aparece uma única vez por lista, mesmo que envolva vários
   * times ou releases (§5.4, CA-010).
   */
  deliveries: z.object({
    openCount: z.number().int(),
    blocked: limitedList(workItemSchema),
    delayed: limitedList(workItemSchema),
    atRisk: limitedList(workItemSchema),
    forecastAfterCommitment: limitedList(workItemSchema),
    stale: limitedList(workItemSchema),
  }),
  /** Sprints ativas (§5.2.4). Capacidade e demanda chegam na Etapa 4. */
  activeSprints: z.array(sprintSchema),
  /** Releases em aberto (§5.2.5). */
  releases: z.array(releaseSchema),
  /** Refinamentos (§5.2.6). */
  refinement: z.object({
    needsRefinement: z.number().int(),
    analyzing: z.number().int(),
    waitingInformation: z.number().int(),
    checklistIncomplete: z.number().int(),
    notReadyForImminentSprint: limitedList(refinementPipelineItemSchema),
  }),
  organization: z.object({
    activeTeams: z.number().int(),
    activeProjects: z.number().int(),
    activeDevelopers: z.number().int(),
  }),
});
export type Dashboard = z.infer<typeof dashboardSchema>;

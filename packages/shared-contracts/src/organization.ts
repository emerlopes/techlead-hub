import { z } from "zod";
import {
  contextCodeSchema,
  contextRefSchema,
  nameSchema,
  optionalText,
  versionSchema,
} from "./common";

export const teamStatuses = ["ACTIVE", "INACTIVE"] as const;
export const projectStatuses = ["ACTIVE", "PAUSED", "ARCHIVED"] as const;
export const developerStatuses = ["ACTIVE", "INACTIVE"] as const;

/* -------------------------------------------------------------------------- */
/* Associações (§9)                                                           */
/* -------------------------------------------------------------------------- */

/** Participação time ↔ projeto (§9.1). `endedAt` preenchido = histórico (RN-025). */
export const teamProjectSchema = z.object({
  id: z.uuid(),
  team: contextRefSchema.extend({ status: z.enum(teamStatuses) }),
  project: contextRefSchema.extend({ status: z.enum(projectStatuses) }),
  isPrimary: z.boolean(),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime().nullable(),
});
export type TeamProject = z.infer<typeof teamProjectSchema>;

/** Participação desenvolvedor ↔ time (§9.3). */
export const teamDeveloperSchema = z.object({
  id: z.uuid(),
  team: contextRefSchema.extend({ status: z.enum(teamStatuses) }),
  developer: z.object({ id: z.uuid(), name: z.string(), status: z.enum(developerStatuses) }),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime().nullable(),
});
export type TeamDeveloper = z.infer<typeof teamDeveloperSchema>;

export const createTeamProjectSchema = z
  .object({ teamId: z.uuid("Selecione um time."), projectId: z.uuid("Selecione um projeto."), isPrimary: z.boolean().default(false) })
  .strict();
export type CreateTeamProjectInput = z.input<typeof createTeamProjectSchema>;

export const createTeamDeveloperSchema = z
  .object({ teamId: z.uuid("Selecione um time."), developerId: z.uuid("Selecione um desenvolvedor.") })
  .strict();
export type CreateTeamDeveloperInput = z.infer<typeof createTeamDeveloperSchema>;

/* -------------------------------------------------------------------------- */
/* Times (§7)                                                                 */
/* -------------------------------------------------------------------------- */

export const teamSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  status: z.enum(teamStatuses),
  activeProjectCount: z.number().int(),
  activeDeveloperCount: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type Team = z.infer<typeof teamSchema>;

export const teamDetailSchema = teamSchema.extend({
  projects: z.array(teamProjectSchema),
  developers: z.array(teamDeveloperSchema),
});
export type TeamDetail = z.infer<typeof teamDetailSchema>;

export const createTeamSchema = z
  .object({ name: nameSchema, code: contextCodeSchema, description: optionalText(500) })
  .strict();
export type CreateTeamInput = z.input<typeof createTeamSchema>;

export const updateTeamSchema = z
  .object({
    name: nameSchema.optional(),
    code: contextCodeSchema.optional(),
    description: optionalText(500),
    /** Ativar/desativar (§7.2). Desativar não apaga histórico (RN-022). */
    status: z.enum(teamStatuses).optional(),
    version: versionSchema,
  })
  .strict();
export type UpdateTeamInput = z.input<typeof updateTeamSchema>;

/* -------------------------------------------------------------------------- */
/* Projetos (§8)                                                              */
/* -------------------------------------------------------------------------- */

export const projectSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  status: z.enum(projectStatuses),
  activeTeamCount: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type Project = z.infer<typeof projectSchema>;

export const projectDetailSchema = projectSchema.extend({
  teams: z.array(teamProjectSchema),
});
export type ProjectDetail = z.infer<typeof projectDetailSchema>;

export const createProjectSchema = createTeamSchema;
export type CreateProjectInput = z.input<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    name: nameSchema.optional(),
    code: contextCodeSchema.optional(),
    description: optionalText(500),
    /** Pausar, arquivar e reativar (§8.2). Arquivado continua consultável (RN-024). */
    status: z.enum(projectStatuses).optional(),
    version: versionSchema,
  })
  .strict();
export type UpdateProjectInput = z.input<typeof updateProjectSchema>;

/* -------------------------------------------------------------------------- */
/* Desenvolvedores (§10) — cadastro de referência, sem login (DEC-002)        */
/* -------------------------------------------------------------------------- */

const developerEmailSchema = z
  .union([z.literal(""), z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.")), z.null()])
  .transform((value) => (value === "" ? null : value))
  .optional();

export const developerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string().nullable(),
  roleDescription: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(developerStatuses),
  /** Times com participação ativa. */
  teams: z.array(contextRefSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int(),
});
export type Developer = z.infer<typeof developerSchema>;

export const developerDetailSchema = developerSchema.extend({
  /** Histórico completo de participação em times (§10.2). */
  memberships: z.array(teamDeveloperSchema),
  /** Projetos em que os times ativos do desenvolvedor atuam hoje. */
  projects: z.array(contextRefSchema),
});
export type DeveloperDetail = z.infer<typeof developerDetailSchema>;

export const createDeveloperSchema = z
  .object({
    name: nameSchema,
    email: developerEmailSchema,
    roleDescription: optionalText(120),
    notes: optionalText(2000),
  })
  .strict();
export type CreateDeveloperInput = z.input<typeof createDeveloperSchema>;

export const updateDeveloperSchema = createDeveloperSchema
  .partial()
  .extend({ status: z.enum(developerStatuses).optional(), version: versionSchema })
  .strict();
export type UpdateDeveloperInput = z.input<typeof updateDeveloperSchema>;

/** Filtro de listagem por situação (RNF-009). */
export const statusFilterSchema = <T extends readonly [string, ...string[]]>(values: T) =>
  z.object({ status: z.enum(values).optional() });

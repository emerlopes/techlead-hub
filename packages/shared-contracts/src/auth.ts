import { z } from "zod";
import { DEFAULT_TIMEZONE, timeZoneSchema, workspaceNameSchema, workspaceSchema } from "./workspace";

export const PASSWORD_MIN_LENGTH = 12;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um e-mail válido."));

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha precisa de ao menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(256, "Use no máximo 256 caracteres.");

/** Configuração inicial do proprietário (§34.1, §44.1): só pode ocorrer uma vez. */
export const setupSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome.").max(80),
    email: emailSchema,
    password: passwordSchema,
    workspaceName: workspaceNameSchema,
    timezone: timeZoneSchema.default(DEFAULT_TIMEZONE),
  })
  .strict();

export type SetupInput = z.input<typeof setupSchema>;

export const loginSchema = z
  .object({
    email: emailSchema,
    // No login não revelamos a política de senha; só exigimos algo preenchido.
    password: z.string().min(1, "Informe a senha.").max(256),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

export const authStatusSchema = z.object({
  setupRequired: z.boolean(),
});

export type AuthStatus = z.infer<typeof authStatusSchema>;

export const authUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const meSchema = z.object({
  user: authUserSchema,
  workspace: workspaceSchema,
  session: z.object({ expiresAt: z.iso.datetime() }),
});

export type Me = z.infer<typeof meSchema>;

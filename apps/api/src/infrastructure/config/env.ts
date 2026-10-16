import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

const csv = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Loopback por padrão: a API só é exposta na rede interna (§44.6). */
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória."),
  /** Origens aceitas em requisições que alteram estado (proteção CSRF, §44.2). */
  WEB_ORIGINS: csv.default(["http://localhost:3000", "http://127.0.0.1:3000"]),
  /** `true` quando a web é servida por HTTPS (§44.7). */
  COOKIE_SECURE: booleanFromString.default(false),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 90).default(24 * 7),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(50).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(24 * 60).default(15),
});

export type Env = z.infer<typeof envSchema>;

/** Falha cedo, listando todas as variáveis inválidas, sem ecoar seus valores. */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuração de ambiente inválida:\n${problems}`);
  }
  return result.data;
}

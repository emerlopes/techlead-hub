import { execSync } from "node:child_process";
import { Client } from "pg";
import { loadEnvFiles } from "../src/infrastructure/config/load-env";

/**
 * Usa um banco dedicado (`DATABASE_URL_TEST`), recria o schema e aplica as migrations versionadas,
 * validando também que elas sobem do zero (§50.2). Nunca aponte para o banco de desenvolvimento.
 */
export default async function setup(): Promise<void> {
  loadEnvFiles();
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("Defina DATABASE_URL_TEST para os testes de integração.");
  if (url === process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL_TEST não pode ser igual a DATABASE_URL.");
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
  } finally {
    await client.end();
  }

  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}

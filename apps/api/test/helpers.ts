import type { INestApplication } from "@nestjs/common";
import { CSRF_HEADER, CSRF_HEADER_VALUE, SESSION_COOKIE } from "@tlh/shared-contracts";
import { createApp } from "../src/app.factory";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";

export async function startApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  process.env.LOGIN_MAX_ATTEMPTS = "3";
  const app = await createApp({ logger: false });
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Limpa as tabelas entre cenários, respeitando as chaves estrangeiras. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE audit_events, sessions, users, workspaces RESTART IDENTITY CASCADE",
  );
}

export const csrf = { [CSRF_HEADER]: CSRF_HEADER_VALUE };

export function sessionCookieFrom(setCookie: string[] | string | undefined): string {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const cookie = list.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) throw new Error("Resposta sem cookie de sessão.");
  return cookie.split(";")[0] ?? "";
}

export const owner = {
  name: "Ana Souza",
  email: "ana@example.com",
  password: "uma-senha-bem-longa",
  workspaceName: "Hub da Ana",
};

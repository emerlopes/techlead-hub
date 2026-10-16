import type { INestApplication } from "@nestjs/common";
import request from "supertest";
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
    "TRUNCATE TABLE focus_queue_items, task_teams, task_projects, tasks, team_projects, team_developers, " +
      "teams, projects, developers, audit_events, sessions, users, workspaces RESTART IDENTITY CASCADE",
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

/** Cria o proprietário e devolve um cliente HTTP autenticado (cookie + CSRF). */
export async function signedIn(app: INestApplication) {
  const res = await request(app.getHttpServer()).post("/api/v1/auth/setup").set(csrf).send(owner).expect(201);
  const cookie = sessionCookieFrom(res.headers["set-cookie"]);
  const server = () => request(app.getHttpServer());
  return {
    get: (path: string) => server().get(`/api/v1${path}`).set("Cookie", cookie),
    post: (path: string, body?: object) => server().post(`/api/v1${path}`).set(csrf).set("Cookie", cookie).send(body),
    patch: (path: string, body: object) => server().patch(`/api/v1${path}`).set(csrf).set("Cookie", cookie).send(body),
    put: (path: string, body: object) => server().put(`/api/v1${path}`).set(csrf).set("Cookie", cookie).send(body),
  };
}

export type SignedIn = Awaited<ReturnType<typeof signedIn>>;

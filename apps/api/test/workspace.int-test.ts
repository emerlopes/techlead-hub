import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { csrf, owner, resetDatabase, sessionCookieFrom, startApp } from "./helpers";

describe("Workspace (integração)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await startApp());
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(prisma);
    const res = await http().post("/api/v1/auth/setup").set(csrf).send(owner).expect(201);
    cookie = sessionCookieFrom(res.headers["set-cookie"]);
  });

  it("atualiza com controle de versão e audita a alteração", async () => {
    const updated = await http()
      .patch("/api/v1/workspace")
      .set(csrf)
      .set("Cookie", cookie)
      .send({ name: "Hub renomeado", timezone: "America/Recife", version: 1 })
      .expect(200);
    expect(updated.body).toMatchObject({ name: "Hub renomeado", timezone: "America/Recife", version: 2 });

    const stale = await http()
      .patch("/api/v1/workspace")
      .set(csrf)
      .set("Cookie", cookie)
      .send({ name: "Sobrescrita", version: 1 })
      .expect(409);
    expect(stale.body.code).toBe("CONFLICT");

    const current = await http().get("/api/v1/workspace").set("Cookie", cookie).expect(200);
    expect(current.body.name).toBe("Hub renomeado");

    const audit = await prisma.auditEvent.findFirstOrThrow({ where: { action: "workspace.updated" } });
    expect(audit.metadata).toEqual({ fields: ["name", "timezone"], fromVersion: 1 });
  });

  it("responde o health check com o banco disponível", async () => {
    await http().get("/api/v1/health").expect(200, { status: "ok", database: "ok" });
  });
});

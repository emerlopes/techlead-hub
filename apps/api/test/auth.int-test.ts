import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { csrf, owner, resetDatabase, sessionCookieFrom, startApp } from "./helpers";

describe("Identity (integração)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await startApp());
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function setup() {
    const res = await http().post("/api/v1/auth/setup").set(csrf).send(owner).expect(201);
    return sessionCookieFrom(res.headers["set-cookie"]);
  }

  it("informa que o setup é necessário e o executa uma única vez", async () => {
    await http().get("/api/v1/auth/status").expect(200, { setupRequired: true });

    const res = await http().post("/api/v1/auth/setup").set(csrf).send(owner).expect(201);
    expect(res.body.user).toMatchObject({ name: owner.name, email: owner.email });
    expect(res.body.workspace).toMatchObject({ name: owner.workspaceName, timezone: "America/Sao_Paulo", version: 1 });
    expect(res.body.user.passwordHash).toBeUndefined();

    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);

    await http().get("/api/v1/auth/status").expect(200, { setupRequired: false });
    const again = await http().post("/api/v1/auth/setup").set(csrf).send(owner).expect(409);
    expect(again.body.code).toBe("SETUP_ALREADY_DONE");
  });

  it("persiste somente o hash Argon2id e o hash do token", async () => {
    const cookie = await setup();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: owner.email } });
    expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
    const token = decodeURIComponent(cookie.split("=")[1] ?? "");
    const sessions = await prisma.session.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.tokenHash).not.toBe(token);
  });

  it("valida o corpo com o contrato compartilhado", async () => {
    const res = await http()
      .post("/api/v1/auth/setup")
      .set(csrf)
      .send({ ...owner, password: "curta" })
      .expect(400);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(res.body.details[0].path).toBe("password");
  });

  it("recusa requisições que alteram estado sem o cabeçalho CSRF ou de outra origem", async () => {
    const missing = await http().post("/api/v1/auth/setup").send(owner).expect(403);
    expect(missing.body.code).toBe("CSRF_REJECTED");
    await http()
      .post("/api/v1/auth/setup")
      .set(csrf)
      .set("Origin", "https://evil.example")
      .send(owner)
      .expect(403);
  });

  it("protege rotas sem sessão e aceita a sessão válida", async () => {
    await http().get("/api/v1/auth/me").expect(401);
    await http().get("/api/v1/workspace").expect(401);
    const cookie = await setup();
    const me = await http().get("/api/v1/auth/me").set("Cookie", cookie).expect(200);
    expect(me.body.user.email).toBe(owner.email);
  });

  it("faz login, logout e invalida a sessão encerrada", async () => {
    await setup();
    const login = await http()
      .post("/api/v1/auth/login")
      .set(csrf)
      .send({ email: "ANA@example.com", password: owner.password })
      .expect(200);
    const cookie = sessionCookieFrom(login.headers["set-cookie"]);

    await http().post("/api/v1/auth/logout").set(csrf).set("Cookie", cookie).expect(204);
    await http().get("/api/v1/auth/me").set("Cookie", cookie).expect(401);

    const actions = (await prisma.auditEvent.findMany({ orderBy: { occurredAt: "asc" } })).map((e) => e.action);
    expect(actions).toEqual(["auth.setup", "auth.login", "auth.logout"]);
  });

  it("não diferencia e-mail inexistente de senha errada e bloqueia após o limite", async () => {
    await setup();
    const unknown = await http()
      .post("/api/v1/auth/login")
      .set(csrf)
      .send({ email: "outra@example.com", password: "x" })
      .expect(401);
    const wrong = await http()
      .post("/api/v1/auth/login")
      .set(csrf)
      .send({ email: owner.email, password: "errada" })
      .expect(401);
    expect(unknown.body.message).toBe(wrong.body.message);

    await http().post("/api/v1/auth/login").set(csrf).send({ email: owner.email, password: "errada" }).expect(401);
    const locked = await http()
      .post("/api/v1/auth/login")
      .set(csrf)
      .send({ email: owner.email, password: "errada" })
      .expect(429);
    expect(locked.body.code).toBe("TOO_MANY_ATTEMPTS");
    expect(Number(locked.headers["retry-after"])).toBeGreaterThan(0);

    // Mesmo a senha correta é recusada durante o bloqueio.
    await http().post("/api/v1/auth/login").set(csrf).send({ email: owner.email, password: owner.password }).expect(429);
  });

  it("indica setup pendente ao tentar login antes da configuração", async () => {
    const res = await http()
      .post("/api/v1/auth/login")
      .set(csrf)
      .send({ email: owner.email, password: owner.password })
      .expect(409);
    expect(res.body.code).toBe("SETUP_REQUIRED");
  });
});

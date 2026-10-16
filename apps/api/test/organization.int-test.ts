import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { resetDatabase, type SignedIn, signedIn, startApp } from "./helpers";

describe("Organização: times, projetos, desenvolvedores e associações (integração)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let api: SignedIn;

  beforeAll(async () => {
    ({ app, prisma } = await startApp());
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(prisma);
    api = await signedIn(app);
  });

  it("cria time com código normalizado e rejeita código repetido no workspace (RN-015)", async () => {
    const created = await api.post("/teams", { name: "Pagamentos", code: "pay", description: "" }).expect(201);
    expect(created.body).toMatchObject({ code: "PAY", description: null, status: "ACTIVE", version: 1, projects: [] });

    const duplicate = await api.post("/teams", { name: "Outro", code: "PAY" }).expect(409);
    expect(duplicate.body.details).toEqual([{ path: "code", message: "Código já utilizado (RN-015)." }]);

    // Mesmo código pode existir entre domínios diferentes (times × projetos).
    await api.post("/projects", { name: "Checkout", code: "PAY" }).expect(201);
  });

  it("atualiza com controle de versão e desativa sem apagar o histórico (RN-022)", async () => {
    const { body: team } = await api.post("/teams", { name: "Pagamentos", code: "PAY" }).expect(201);
    const updated = await api.patch(`/teams/${team.id}`, { status: "INACTIVE", version: 1 }).expect(200);
    expect(updated.body).toMatchObject({ status: "INACTIVE", version: 2 });

    const stale = await api.patch(`/teams/${team.id}`, { name: "Sobrescrita", version: 1 }).expect(409);
    expect(stale.body.code).toBe("CONFLICT");

    await api.get(`/teams/${team.id}`).expect(200);
    const list = await api.get("/teams?status=INACTIVE").expect(200);
    expect(list.body).toHaveLength(1);

    const audit = await prisma.auditEvent.findFirstOrThrow({ where: { action: "team.updated" } });
    expect(audit.metadata).toEqual({ fields: ["status"], fromVersion: 1, status: "INACTIVE" });
  });

  it("associa times e projetos muitos-para-muitos preservando o período (RN-013, RN-025, §9.2)", async () => {
    const { body: pay } = await api.post("/teams", { name: "Pagamentos", code: "PAY" }).expect(201);
    const { body: core } = await api.post("/teams", { name: "Core", code: "CORE" }).expect(201);
    const { body: chk } = await api.post("/projects", { name: "Checkout", code: "CHK" }).expect(201);

    const link = await api.post("/team-projects", { teamId: pay.id, projectId: chk.id, isPrimary: true }).expect(201);
    await api.post("/team-projects", { teamId: core.id, projectId: chk.id }).expect(201);
    const dup = await api.post("/team-projects", { teamId: pay.id, projectId: chk.id }).expect(409);
    expect(dup.body.code).toBe("CONFLICT");

    const project = await api.get(`/projects/${chk.id}`).expect(200);
    expect(project.body.activeTeamCount).toBe(2);

    const ended = await api.post(`/team-projects/${link.body.id}/end`).expect(200);
    expect(ended.body.endedAt).not.toBeNull();
    await api.post(`/team-projects/${link.body.id}/end`).expect(422);

    // Encerrada continua no histórico e libera nova participação ativa.
    await api.post("/team-projects", { teamId: pay.id, projectId: chk.id }).expect(201);
    const team = await api.get(`/teams/${pay.id}`).expect(200);
    expect(team.body.projects).toHaveLength(2);
    expect(team.body.projects[0].endedAt).toBeNull();
    expect(team.body.activeProjectCount).toBe(1);
  });

  it("não associa time a projeto arquivado (§8.5) nem a time inativo (§7.4)", async () => {
    const { body: team } = await api.post("/teams", { name: "Pagamentos", code: "PAY" }).expect(201);
    const { body: project } = await api.post("/projects", { name: "Legado", code: "OLD" }).expect(201);
    await api.patch(`/projects/${project.id}`, { status: "ARCHIVED", version: 1 }).expect(200);

    const archived = await api.post("/team-projects", { teamId: team.id, projectId: project.id }).expect(422);
    expect(archived.body.code).toBe("RULE_VIOLATION");

    await api.patch(`/teams/${team.id}`, { status: "INACTIVE", version: 1 }).expect(200);
    const { body: dev } = await api.post("/developers", { name: "Bruno Lima" }).expect(201);
    await api.post("/team-developers", { teamId: team.id, developerId: dev.id }).expect(422);
  });

  it("desenvolvedor participa de vários times e mostra projetos relacionados (RN-014, §10.2)", async () => {
    const { body: pay } = await api.post("/teams", { name: "Pagamentos", code: "PAY" }).expect(201);
    const { body: core } = await api.post("/teams", { name: "Core", code: "CORE" }).expect(201);
    const { body: chk } = await api.post("/projects", { name: "Checkout", code: "CHK" }).expect(201);
    await api.post("/team-projects", { teamId: pay.id, projectId: chk.id }).expect(201);

    const { body: dev } = await api
      .post("/developers", { name: "Bruno Lima", email: " Bruno@Example.com ", roleDescription: "Backend" })
      .expect(201);
    expect(dev.email).toBe("bruno@example.com");

    const m1 = await api.post("/team-developers", { teamId: pay.id, developerId: dev.id }).expect(201);
    await api.post("/team-developers", { teamId: core.id, developerId: dev.id }).expect(201);

    const detail = await api.get(`/developers/${dev.id}`).expect(200);
    expect(detail.body.teams.map((t: { code: string }) => t.code)).toEqual(["CORE", "PAY"]);
    expect(detail.body.projects.map((p: { code: string }) => p.code)).toEqual(["CHK"]);

    await api.post(`/team-developers/${m1.body.id}/end`).expect(200);
    const after = await api.get(`/developers/${dev.id}`).expect(200);
    expect(after.body.teams.map((t: { code: string }) => t.code)).toEqual(["CORE"]);
    expect(after.body.memberships).toHaveLength(2);
    expect(after.body.projects).toEqual([]);
  });

  it("isola o workspace e trata identificadores inválidos como inexistentes", async () => {
    await api.get("/teams/nao-e-uuid").expect(404);
    await api.get(`/projects/${crypto.randomUUID()}`).expect(404);
    await api.patch(`/developers/${crypto.randomUUID()}`, { name: "X Y", version: 1 }).expect(404);
  });
});

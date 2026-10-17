import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { resetDatabase, type SignedIn, signedIn, startApp } from "./helpers";

type Ref = { id: string };

describe("Exclusão definitiva (integração, §35.9)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let api: SignedIn;
  let pay: Ref;
  let chk: Ref;
  let ana: Ref;
  let jira: Ref;

  beforeAll(async () => {
    ({ app, prisma } = await startApp());
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(prisma);
    api = await signedIn(app);
    pay = (await api.post("/teams", { name: "Pagamentos", code: "PAY" }).expect(201)).body;
    chk = (await api.post("/projects", { name: "Checkout", code: "CHK" }).expect(201)).body;
    ana = (await api.post("/developers", { name: "Ana Lima" }).expect(201)).body;
    [jira] = (await api.post("/external-sources", { name: "Jira" }).expect(201)).body;
    await api.post("/team-projects", { teamId: pay.id, projectId: chk.id }).expect(201);
    await api.post("/team-developers", { teamId: pay.id, developerId: ana.id }).expect(201);
  });

  const createItem = async () =>
    (
      await api
        .post("/work-items", { sourceId: jira.id, projectId: chk.id, externalKey: "CHK-1", title: "Checkout", executingTeamId: pay.id, developerId: ana.id })
        .expect(201)
    ).body;

  it("projeto sai com itens, releases e vínculos; atividades e riscos ficam sem o vínculo e o dashboard deixa de contar", async () => {
    const item = await createItem();
    const release = (await api.post("/releases", { projectId: chk.id, name: "Checkout 2.0" }).expect(201)).body;
    await api.post(`/releases/${release.id}/items`, { workItemId: item.id }).expect(200);
    const task = (await api.post("/tasks", { title: "Revisar", projectIds: [chk.id], workItemIds: [item.id] }).expect(201)).body;
    const risk = (await api.post("/risks", { title: "Fornecedor", type: "RISK", links: { projectIds: [chk.id], teamIds: [pay.id] } }).expect(201)).body;
    expect((await api.get("/dashboard").expect(200)).body.organization.activeProjects).toBe(1);

    await api.delete(`/projects/${chk.id}`).expect(204);

    await api.get(`/projects/${chk.id}`).expect(404);
    await api.get(`/work-items/${item.id}`).expect(404);
    await api.get(`/releases/${release.id}`).expect(404);
    const kept = (await api.get(`/tasks/${task.id}`).expect(200)).body;
    expect(kept).toMatchObject({ projects: [], workItems: [] });
    expect((await api.get(`/risks/${risk.id}`).expect(200)).body.links).toMatchObject({ projects: [], teams: [{ id: pay.id }] });
    expect((await api.get("/dashboard").expect(200)).body.organization.activeProjects).toBe(0);
    expect(await prisma.auditEvent.count({ where: { action: "project.deleted", entityId: chk.id } })).toBe(1);

    await api.delete(`/projects/${chk.id}`).expect(404);
  });

  it("time sai com sprints e associações; pessoa sai com alocações e o acompanhamento perde o responsável", async () => {
    const item = await createItem();
    const sprint = (await api.post("/sprints", { teamId: pay.id, name: "Sprint 1", startDate: "2026-11-02", endDate: "2026-11-13" }).expect(201)).body;
    await api.post(`/sprints/${sprint.id}/items`, { workItemId: item.id }).expect(200);
    await api.post("/capacity/allocations", { developerId: ana.id, teamId: pay.id, allocationType: "PERCENTAGE", value: 0.5, validFrom: "2026-01-01" }).expect(201);

    await api.delete(`/developers/${ana.id}`).expect(204);
    expect(await prisma.capacityAllocation.count()).toBe(0);
    expect((await api.get(`/work-items/${item.id}`).expect(200)).body.tracking.developer).toBeNull();

    await api.delete(`/teams/${pay.id}`).expect(204);
    await api.get(`/sprints/${sprint.id}`).expect(404);
    expect((await api.get(`/work-items/${item.id}`).expect(200)).body.tracking.executingTeam).toBeNull();
    expect(await prisma.teamProject.count()).toBe(0);
  });

  it("registro do diário e atividade são excluídos sem afetar o restante", async () => {
    const entry = (await api.post("/journal", { category: "TECH_DECISION", description: "Adotar Pix", links: { projectIds: [chk.id] } }).expect(201)).body;
    const task = (await api.post("/tasks", { title: "Revisar" }).expect(201)).body;

    await api.delete(`/journal/${entry.id}`).expect(204);
    await api.delete(`/tasks/${task.id}`).expect(204);

    expect((await api.get("/journal").expect(200)).body.items).toHaveLength(0);
    await api.get(`/tasks/${task.id}`).expect(404);
    await api.get(`/projects/${chk.id}`).expect(200);
  });
});

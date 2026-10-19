import type { INestApplication } from "@nestjs/common";
import { addDays, todayIn } from "@tlh/shared-contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { resetDatabase, type SignedIn, signedIn, startApp } from "./helpers";

type Ref = { id: string };
type Keyed = { workItem: { externalKey: string } };
const keys = (list: Keyed[]) => list.map((e) => e.workItem.externalKey);

const today = () => todayIn("America/Sao_Paulo");

describe("Relatórios (integração)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let api: SignedIn;
  let pay: Ref;
  let chk: Ref;
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
    [jira] = (await api.post("/external-sources", { name: "Jira" }).expect(201)).body;
  });

  let seq = 0;
  const createItem = async (body: object = {}) =>
    (
      await api
        .post("/work-items", { sourceId: jira.id, projectId: chk.id, externalKey: `CHK-${++seq}`, title: "Entrega", executingTeamId: pay.id, ...body })
        .expect(201)
    ).body as Ref & { externalKey: string };

  it("relatório de sprint (§31.1) e rascunhos sem fatos inventados (§31.4, §31.5)", async () => {
    const done = await createItem({ externalKey: "CHK-A" });
    const blocked = await createItem({ externalKey: "CHK-B" });
    const added = await createItem({ externalKey: "CHK-C" });
    const removed = await createItem({ externalKey: "CHK-D" });
    const sprint = (await api.post("/sprints", { teamId: pay.id, name: "Sprint 1", startDate: today(), endDate: addDays(today(), 13) }).expect(201)).body;
    for (const item of [done, blocked, removed]) await api.post(`/sprints/${sprint.id}/items`, { workItemId: item.id }).expect(200);
    await api.post(`/sprints/${sprint.id}/start`, { name: "Sprint 1", goal: "Pix no checkout", version: 1 }).expect(200);
    await api.post(`/sprints/${sprint.id}/items`, { workItemId: added.id }).expect(200);
    await api.post(`/sprints/${sprint.id}/items/${removed.id}/remove`).expect(200);
    await api.patch(`/work-items/${done.id}`, { executionStatus: "DONE", version: 1 }).expect(200);

    await api.post("/risks", { title: "Gateway fora", type: "IMPEDIMENT", blockingLevel: "FULL", links: { workItemIds: [blocked.id] } }).expect(201);
    await api.post("/risks", { title: "Pico de demanda", links: { sprintIds: [sprint.id] } }).expect(201);
    await api.post("/risks", { title: "Risco de outro contexto", links: { projectIds: [chk.id] } }).expect(201);
    await api.post("/journal", { category: "TECH_DECISION", description: "Adotar fila para webhooks", links: { sprintIds: [sprint.id] } }).expect(201);
    await api.post("/journal", { category: "ACHIEVEMENT", description: "Pix aprovado em homologação", links: { workItemIds: [done.id] } }).expect(201);
    // Fora do período da sprint: o item tem histórico anterior que não pertence a ela.
    await api
      .post("/journal", { category: "LEARNING", description: "Antigo", occurredOn: addDays(today(), -30), links: { workItemIds: [done.id] } })
      .expect(201);

    const report = (await api.get(`/reports/sprints/${sprint.id}`).expect(200)).body;
    expect(report.sprint).toMatchObject({ name: "Sprint 1", goal: "Pix no checkout", status: "ACTIVE", team: { code: "PAY" } });
    expect(report.sprint).not.toHaveProperty("items");
    expect(keys(report.originalScope)).toEqual(["CHK-A", "CHK-B", "CHK-D"]);
    expect(report.scopeChanges.map((c: { kind: string; workItem: { externalKey: string } }) => [c.kind, c.workItem.externalKey])).toEqual([
      ["ADDED", "CHK-C"],
      ["REMOVED", "CHK-D"],
    ]);
    expect(keys(report.completed)).toEqual(["CHK-A"]);
    expect(keys(report.pending)).toEqual(["CHK-B", "CHK-C"]);
    expect(keys(report.blockedItems)).toEqual(["CHK-B"]);
    expect(report.impediments.map((r: { title: string }) => r.title)).toEqual(["Gateway fora"]);
    expect(report.risks.map((r: { title: string }) => r.title)).toEqual(["Pico de demanda"]);
    expect(report.decisions.map((e: { description: string }) => e.description)).toEqual(["Adotar fila para webhooks"]);
    expect(report.events.map((e: { description: string }) => e.description)).toEqual(["Pix aprovado em homologação"]);
    expect(report.sprint.capacity).toMatchObject({ level: "NO_CAPACITY" });

    const demo = (await api.post("/reports/generate", { type: "SPRINT_DEMO", sprintId: sprint.id }).expect(200)).body;
    const demoSections = Object.fromEntries(demo.sections.map((s: { key: string }) => [s.key, s]));
    expect(demoSections.COMPLETED_DELIVERIES.entries.map((e: { text: string }) => e.text)).toEqual(["CHK-A — Entrega"]);
    expect(demoSections.RELEVANT_FEATURES.entries.map((e: { text: string }) => e.text)).toEqual(["Pix aprovado em homologação"]);
    expect(demoSections.EVENTS).toMatchObject({ state: "NO_DATA", entries: [] });

    const retro = (await api.post("/reports/generate", { type: "SPRINT_RETROSPECTIVE", sprintId: sprint.id }).expect(200)).body;
    const retroSections = Object.fromEntries(retro.sections.map((s: { key: string }) => [s.key, s]));
    expect(retroSections.LEARNINGS).toMatchObject({ state: "NO_DATA" });
    expect(retroSections.SUGGESTED_ACTIONS).toMatchObject({ state: "NOT_GENERATED", entries: [] });
    expect(retroSections.BLOCKS.entries).toHaveLength(2);

    // Gerar não altera nada: nenhum evento de auditoria novo.
    const audits = await prisma.auditEvent.count();
    await api.post("/reports/generate", { type: "SPRINT_DEMO", sprintId: sprint.id }).expect(200);
    expect(await prisma.auditEvent.count()).toBe(audits);
  });

  it("valida a geração e responde 404 para sprint inexistente", async () => {
    await api.post("/reports/generate", { type: "SPRINT_DEMO" }).expect(400);
    await api.post("/reports/generate", { type: "QUALQUER", sprintId: crypto.randomUUID() }).expect(400);
    await api.post("/reports/generate", { type: "SPRINT_DEMO", sprintId: crypto.randomUUID() }).expect(404);
    await api.get(`/reports/sprints/${crypto.randomUUID()}`).expect(404);
    await api.get("/reports/sprints/nao-e-uuid").expect(404);
  });

  it("relatório de release (§31.2): previsão manual ou \"sem previsão\", dependências e mudanças", async () => {
    const required = await createItem({ externalKey: "CHK-R" });
    const optional = await createItem({ externalKey: "CHK-O" });
    const dropped = await createItem({ externalKey: "CHK-X" });
    const release = (
      await api.post("/releases", { projectId: chk.id, name: "Checkout 2.0", committedDate: addDays(today(), 30), forecastDate: addDays(today(), 35) }).expect(201)
    ).body;
    await api.post(`/releases/${release.id}/items`, { workItemId: required.id }).expect(200);
    await api.post(`/releases/${release.id}/items`, { workItemId: optional.id, isRequired: false }).expect(200);
    await api.post(`/releases/${release.id}/items`, { workItemId: dropped.id }).expect(200);
    await api.post(`/releases/${release.id}/items/${dropped.id}/remove`).expect(200);
    await api.post("/work-dependencies", { dependencyType: "EXTERNAL", externalReference: "API do banco", successorId: required.id }).expect(201);
    await api.post("/risks", { title: "Homologação do banco", links: { releaseIds: [release.id] } }).expect(201);
    const solved = (await api.post("/risks", { title: "Já resolvido", links: { workItemIds: [required.id] } }).expect(201)).body;
    await api.patch(`/risks/${solved.id}`, { status: "RESOLVED", version: 1 }).expect(200);
    await api.post("/journal", { category: "SCOPE_CHANGE", description: "CHK-X ficou para a 2.1", links: { releaseIds: [release.id] } }).expect(201);

    const report = (await api.get(`/reports/releases/${release.id}`).expect(200)).body;
    expect(report.release).toMatchObject({ name: "Checkout 2.0", project: { code: "CHK" }, committedDate: addDays(today(), 30), teams: [{ code: "PAY" }] });
    expect(report.forecast).toMatchObject({ date: addDays(today(), 35), source: "MANUAL", confidence: null });
    expect(report.forecast.recordedAt).not.toBeNull();
    expect(keys(report.required)).toEqual(["CHK-R"]);
    expect(keys(report.optional)).toEqual(["CHK-O"]);
    expect(report.dependencies).toHaveLength(1);
    expect(report.dependencies[0]).toMatchObject({ dependencyType: "EXTERNAL", successor: { externalKey: "CHK-R" } });
    expect(report.risks.map((r: { title: string }) => r.title)).toEqual(["Homologação do banco"]);
    expect(report.changes.map((c: { kind: string }) => c.kind).sort()).toEqual(["FORECAST", "JOURNAL", "SCOPE_REMOVED"]);

    const bare = (await api.post("/releases", { projectId: chk.id, name: "Sem datas" }).expect(201)).body;
    const empty = (await api.get(`/reports/releases/${bare.id}`).expect(200)).body;
    expect(empty.forecast).toBeNull();
    expect(empty).toMatchObject({ required: [], optional: [], dependencies: [], risks: [], changes: [] });
  });

  it("relatório de capacidade (§31.3): mesmos números da visão geral", async () => {
    const ana = (await api.post("/developers", { name: "Ana Lima" }).expect(201)).body;
    await api.post("/team-developers", { teamId: pay.id, developerId: ana.id }).expect(201);
    await api
      .post("/capacity/schedules", { developerId: ana.id, validFrom: "2026-01-01", weeklyPattern: [8, 8, 8, 8, 8, 0, 0], focusFactor: 1 })
      .expect(201);
    await api.post("/capacity/allocations", { developerId: ana.id, teamId: pay.id, allocationType: "PERCENTAGE", value: 1, validFrom: "2026-01-01" }).expect(201);
    await api.post("/capacity/allocations", { developerId: ana.id, projectId: chk.id, allocationType: "PERCENTAGE", value: 0.5, validFrom: "2026-01-01" }).expect(201);

    const range = `from=${today()}&to=${addDays(today(), 13)}`;
    const [report, overview] = await Promise.all([api.get(`/reports/capacity?${range}`).expect(200), api.get(`/capacity?${range}`).expect(200)]);
    expect(report.body.generatedAt).toEqual(expect.any(String));
    expect(report.body.totals).toEqual(overview.body.totals);
    expect(report.body.developers[0].issues.map((i: { type: string }) => i.type)).toContain("PERCENTAGE_OVER_LIMIT");
    await api.get(`/reports/capacity?from=${today()}&to=${addDays(today(), -1)}`).expect(400);
  });
});

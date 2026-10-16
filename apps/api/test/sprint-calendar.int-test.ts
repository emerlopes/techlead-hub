import type { INestApplication } from "@nestjs/common";
import { addDays, todayIn } from "@tlh/shared-contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { resetDatabase, type SignedIn, signedIn, startApp } from "./helpers";

type Ref = { id: string };

describe("Sprints geradas pela release e início com nome e objetivo (integração)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let api: SignedIn;
  let chk: Ref;
  let pay: Ref;
  let core: Ref;
  const today = () => todayIn("America/Sao_Paulo");
  // Próxima segunda-feira, para o calendário não depender do dia em que o teste roda.
  const monday = () => {
    const day = new Date(`${today()}T00:00:00Z`).getUTCDay();
    return addDays(today(), ((8 - day) % 7) || 7);
  };

  beforeAll(async () => {
    ({ app, prisma } = await startApp());
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(prisma);
    api = await signedIn(app);
    chk = (await api.post("/projects", { name: "Checkout", code: "CHK" }).expect(201)).body;
    pay = (await api.post("/teams", { name: "Pagamentos", code: "PAY" }).expect(201)).body;
    core = (await api.post("/teams", { name: "Plataforma", code: "CORE" }).expect(201)).body;
    await api.post("/team-projects", { teamId: pay.id, projectId: chk.id }).expect(201);
    await api.post("/team-projects", { teamId: core.id, projectId: chk.id }).expect(201);
  });

  it("gera sprints de N dias úteis para cada time do projeto até o prazo", async () => {
    const start = monday();
    const res = await api
      .post("/releases", { projectId: chk.id, name: "Checkout 3.0", startDate: start, committedDate: addDays(start, 25), sprintLengthDays: 10 })
      .expect(201);
    // 10 dias úteis = duas semanas; 26 dias corridos pedem 2 sprints por time.
    expect(res.body.sprintGeneration).toEqual({ created: 4, skipped: 0, teams: 2 });
    expect(res.body).toMatchObject({ startDate: start, sprintLengthDays: 10 });
    const pays = res.body.generatedSprints.filter((s: { team: { code: string } }) => s.team.code === "PAY");
    expect(pays).toEqual([
      expect.objectContaining({ startDate: start, endDate: addDays(start, 11), status: "PLANNED", name: "Sprint 1 · Checkout 3.0" }),
      expect.objectContaining({ startDate: addDays(start, 14), endDate: addDays(start, 25) }),
    ]);
    const sprint = (await api.get(`/sprints/${pays[0].id}`).expect(200)).body;
    expect(sprint).toMatchObject({ goal: null, release: { id: res.body.id, name: "Checkout 3.0" } });
  });

  it("pula períodos ocupados por sprints abertas do time e ignora times encerrados", async () => {
    const start = monday();
    await api.post("/sprints", { teamId: pay.id, name: "Sprint existente", startDate: start, endDate: addDays(start, 4) }).expect(201);
    const assoc = (await api.get(`/teams/${core.id}`).expect(200)).body.projects[0];
    await api.post(`/team-projects/${assoc.id}/end`).expect(200);

    const res = await api
      .post("/releases", { projectId: chk.id, name: "R1", startDate: start, committedDate: addDays(start, 25), sprintLengthDays: 10 })
      .expect(201);
    expect(res.body.sprintGeneration).toEqual({ created: 1, skipped: 1, teams: 1 });
    expect(res.body.generatedSprints[0]).toMatchObject({ team: { code: "PAY" }, startDate: addDays(start, 14) });
  });

  it("exige prazo e times participantes; sem duração não gera nada", async () => {
    await api.post("/releases", { projectId: chk.id, name: "Sem prazo", sprintLengthDays: 10 }).expect(400);
    await api.post("/releases", { projectId: chk.id, name: "Longa", committedDate: addDays(today(), 10), sprintLengthDays: 61 }).expect(400);
    const plain = await api.post("/releases", { projectId: chk.id, name: "Manual", committedDate: addDays(today(), 10) }).expect(201);
    expect(plain.body).toMatchObject({ sprintGeneration: null, generatedSprints: [], sprintLengthDays: null });

    const solo = (await api.post("/projects", { name: "Solo", code: "SOLO" }).expect(201)).body;
    const refused = await api
      .post("/releases", { projectId: solo.id, name: "R1", committedDate: addDays(today(), 10), sprintLengthDays: 5 })
      .expect(422);
    expect(refused.body.details[0].path).toBe("sprintLengthDays");
    // Início padrão = hoje no fuso do workspace.
    const defaulted = await api
      .post("/releases", { projectId: chk.id, name: "Hoje", committedDate: addDays(today(), 3), sprintLengthDays: 5 })
      .expect(201);
    expect(defaulted.body.startDate).toBe(today());
  });

  it("iniciar a sprint exige nome e objetivo, só a partir de planejada", async () => {
    const start = monday();
    const res = await api
      .post("/releases", { projectId: chk.id, name: "R1", startDate: start, committedDate: addDays(start, 4), sprintLengthDays: 5 })
      .expect(201);
    const sprint = res.body.generatedSprints[0];

    await api.post(`/sprints/${sprint.id}/start`, { name: "Sprint 1", version: 1 }).expect(400);
    await api.patch(`/sprints/${sprint.id}`, { status: "ACTIVE", version: 1 }).expect(400);
    const started = await api
      .post(`/sprints/${sprint.id}/start`, { name: "Pix em produção", goal: "Liberar Pix para 10% dos clientes", version: 1 })
      .expect(200);
    expect(started.body).toMatchObject({ status: "ACTIVE", name: "Pix em produção", goal: "Liberar Pix para 10% dos clientes" });
    expect(started.body.history[0]).toMatchObject({ action: "sprint.started", fromStatus: "PLANNED", toStatus: "ACTIVE" });
    await api.post(`/sprints/${sprint.id}/start`, { name: "Outra", goal: "Outro objetivo", version: 2 }).expect(422);
  });
});

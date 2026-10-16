import type { INestApplication } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { resetDatabase, type SignedIn, signedIn, startApp } from "./helpers";

type Ref = { id: string };

// Semana de referência: 2026-10-19 (segunda) a 2026-10-25 (domingo).
const MON = "2026-10-19";
const TUE = "2026-10-20";
const FRI = "2026-10-23";
const SUN = "2026-10-25";
const week = `from=${MON}&to=${SUN}`;
const fullTime = { validFrom: "2026-01-01", weeklyPattern: [8, 8, 8, 8, 8, 0, 0], focusFactor: 0.75 };

describe("Capacidade (integração)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let api: SignedIn;
  let pay: Ref;
  let core: Ref;
  let chk: Ref;
  let auth: Ref;
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
    core = (await api.post("/teams", { name: "Core", code: "CORE" }).expect(201)).body;
    chk = (await api.post("/projects", { name: "Checkout", code: "CHK" }).expect(201)).body;
    auth = (await api.post("/projects", { name: "Autenticação", code: "AUTH" }).expect(201)).body;
    ana = (await api.post("/developers", { name: "Ana Lima" }).expect(201)).body;
    [jira] = (await api.post("/external-sources", { name: "Jira" }).expect(201)).body;
    await api.post("/team-developers", { teamId: pay.id, developerId: ana.id }).expect(201);
  });

  const schedule = (body: object = {}) => api.post("/capacity/schedules", { developerId: ana.id, ...fullTime, ...body });
  const allocate = (body: object) =>
    api.post("/capacity/allocations", { developerId: ana.id, allocationType: "PERCENTAGE", validFrom: "2026-01-01", ...body });
  const capacityOf = async (dev: Ref = ana, range = week) => (await api.get(`/developers/${dev.id}/capacity?${range}`).expect(200)).body;
  const createItem = async (body: object = {}) =>
    (await api.post("/work-items", { sourceId: jira.id, projectId: chk.id, externalKey: "CHK-1", title: "Checkout", ...body }).expect(201)).body;

  describe("jornadas e capacidade efetiva (§18, §19)", () => {
    it("CE = (HN − HI) × FF: 40 h, 8 h de ausência e 75% → 24 h (§18.3)", async () => {
      const created = (await schedule().expect(201)).body;
      expect(created).toMatchObject({ weeklyHours: 40, focusFactor: 0.75, validUntil: null, timezone: "America/Sao_Paulo" });
      await api.post(`/developers/${ana.id}/availability-exceptions`, { type: "VACATION", startDate: MON }).expect(201);

      const cap = await capacityOf();
      expect(cap.summary).toMatchObject({ nominalHours: 40, unavailableHours: 8, effectiveHours: 24, absenceDays: 1, scheduledDays: 7 });
      expect(cap.days).toHaveLength(7);
      expect(cap.days[0]).toMatchObject({ date: MON, nominal: 8, unavailable: 8, effective: 0 });
    });

    it("nova jornada encerra a anterior e preserva o histórico; sobreposição é rejeitada (§19.4, §35.7)", async () => {
      const first = (await schedule().expect(201)).body;
      await schedule({ validFrom: "2026-10-21", weeklyPattern: [4, 4, 4, 4, 4, 0, 0], focusFactor: 1 }).expect(201);

      const list = (await api.get(`/capacity/schedules?developerId=${ana.id}`).expect(200)).body;
      expect(list).toHaveLength(2);
      expect(list.find((s: { id: string }) => s.id === first.id)).toMatchObject({ validUntil: "2026-10-20", version: 2 });
      // Seg e ter na jornada antiga (8 h, 75%); qua a sex na nova (4 h, 100%).
      expect((await capacityOf()).summary).toMatchObject({ nominalHours: 28, effectiveHours: 24 });

      // A jornada futura já cobre o período: outra igual seria sobreposta.
      const clash = await schedule({ validFrom: "2026-10-21", validUntil: "2026-10-30" }).expect(409);
      expect(clash.body.details[0].path).toBe("validFrom");
      const second = list.find((s: { id: string }) => s.id !== first.id);
      await api.patch(`/capacity/schedules/${first.id}`, { validUntil: "2026-10-22", version: 2 }).expect(409);
      await api.patch(`/capacity/schedules/${second.id}`, { focusFactor: 0.5, version: 1 }).expect(200);
    });

    it("sem jornada a capacidade não é inventada (§3.4)", async () => {
      await allocate({ teamId: pay.id, value: 0.5 }).expect(201);
      const cap = await capacityOf();
      expect(cap.summary).toMatchObject({ scheduledDays: 0, effectiveHours: 0, allocatedHours: 0 });
      expect(cap.issues.map((i: { type: string }) => i.type)).toContain("NO_SCHEDULE");
    });

    it("rejeita padrão semanal inválido e fator de foco fora de 0–1", async () => {
      await schedule({ weeklyPattern: [8, 8, 8] }).expect(400);
      await schedule({ weeklyPattern: [25, 8, 8, 8, 8, 0, 0] }).expect(400);
      await schedule({ focusFactor: 1.2 }).expect(400);
    });
  });

  describe("ausências e calendário (§19.2–§19.4)", () => {
    beforeEach(async () => {
      await schedule().expect(201);
    });

    it("exceções sobrepostas são consolidadas: nada é descontado duas vezes (§18.4)", async () => {
      await api.post("/capacity/availability-exceptions", { type: "HOLIDAY", startDate: MON, description: "Feriado municipal" }).expect(201);
      await api.post(`/developers/${ana.id}/availability-exceptions`, { type: "VACATION", startDate: MON, endDate: TUE }).expect(201);
      await api.post(`/developers/${ana.id}/availability-exceptions`, { type: "TRAINING", startDate: TUE, unavailableHours: 3 }).expect(201);
      await api.post(`/developers/${ana.id}/availability-exceptions`, { type: "EXTRA_SUPPORT", startDate: FRI, unavailableHours: 2 }).expect(201);

      const cap = await capacityOf();
      expect(cap.summary).toMatchObject({ unavailableHours: 8 + 8 + 2, effectiveHours: (40 - 18) * 0.75 });
      expect(cap.exceptions.map((e: { type: string }) => e.type)).toEqual(["HOLIDAY", "VACATION", "TRAINING", "EXTRA_SUPPORT"]);
    });

    it("cancelar a ausência devolve a capacidade na hora (CA-015, RN-034)", async () => {
      const absence = (await api.post(`/developers/${ana.id}/availability-exceptions`, { type: "ABSENCE", startDate: MON, endDate: FRI }).expect(201)).body;
      expect((await capacityOf()).summary.effectiveHours).toBe(0);

      await api.post(`/capacity/availability-exceptions/${absence.id}/cancel`, { version: 1 }).expect(200);
      expect((await capacityOf()).summary.effectiveHours).toBe(30);
      await api.post(`/capacity/availability-exceptions/${absence.id}/cancel`, { version: 2 }).expect(422);
      const cancelled = (await api.get("/capacity/availability-exceptions?scope=cancelled").expect(200)).body;
      expect(cancelled).toHaveLength(1);
    });

    it("sem pessoa só há feriado; períodos inválidos são rejeitados", async () => {
      await api.post("/capacity/availability-exceptions", { type: "VACATION", startDate: MON }).expect(400);
      await api.post(`/developers/${ana.id}/availability-exceptions`, { type: "VACATION", startDate: FRI, endDate: MON }).expect(400);
      await api.post(`/developers/${ana.id}/availability-exceptions`, { type: "TRAINING", startDate: MON, unavailableHours: 30 }).expect(400);
    });

    it("a auditoria registra tipo e período, nunca o motivo (§44.5)", async () => {
      const absence = (
        await api.post(`/developers/${ana.id}/availability-exceptions`, { type: "ABSENCE", startDate: MON, description: "Consulta" }).expect(201)
      ).body;
      const event = await prisma.auditEvent.findFirstOrThrow({ where: { entityId: absence.id } });
      expect(JSON.stringify(event.metadata)).not.toContain("Consulta");
    });
  });

  describe("alocações (§20)", () => {
    beforeEach(async () => {
      await schedule().expect(201);
      await api.post(`/developers/${ana.id}/availability-exceptions`, { type: "DAY_OFF", startDate: MON }).expect(201);
    });

    it("distribui a capacidade efetiva entre contextos (§20.4) e sinaliza excesso (CA-011, RN-029)", async () => {
      await allocate({ projectId: chk.id, teamId: pay.id, value: 0.5 }).expect(201);
      await allocate({ projectId: auth.id, value: 0.3 }).expect(201);
      await allocate({ value: 0.2, description: "Suporte geral" }).expect(201);

      let cap = await capacityOf();
      expect(cap.summary).toMatchObject({ effectiveHours: 24, allocatedHours: 24, freeHours: 0, peakAllocationPercent: 100 });
      expect(cap.allocations.map((a: { hours: number }) => a.hours)).toEqual([12, 7.2, 4.8]);
      expect(cap.issues).toEqual([]);

      await allocate({ projectId: auth.id, value: 0.1, validFrom: TUE }).expect(201);
      cap = await capacityOf();
      expect(cap.summary).toMatchObject({ overAllocatedHours: 2.4, peakAllocationPercent: 110 });
      expect(cap.issues.map((i: { type: string }) => i.type)).toEqual(expect.arrayContaining(["OVER_ALLOCATED", "PERCENTAGE_OVER_LIMIT"]));

      const dashboard = (await api.get("/dashboard").expect(200)).body;
      expect(dashboard.capacity.overAllocatedDevelopers.map((d: { developer: { name: string } }) => d.developer.name)).toEqual(["Ana Lima"]);
      expect(dashboard.capacity.projectConflicts[0].projects.map((p: { code: string }) => p.code).sort()).toEqual(["AUTH", "CHK"]);
    });

    it("a capacidade de uma pessoa não é duplicada entre times (CA-021, RN-037)", async () => {
      await api.post("/team-developers", { teamId: core.id, developerId: ana.id }).expect(201);
      await allocate({ teamId: pay.id, value: 0.6 }).expect(201);
      await allocate({ teamId: core.id, value: 0.4 }).expect(201);

      const [payCap, coreCap, overview] = await Promise.all([
        api.get(`/teams/${pay.id}/capacity?${week}`).expect(200),
        api.get(`/teams/${core.id}/capacity?${week}`).expect(200),
        api.get(`/capacity?${week}`).expect(200),
      ]);
      expect(payCap.body.allocatedHours).toBe(14.4);
      expect(coreCap.body.allocatedHours).toBe(9.6);
      expect(payCap.body.members[0]).toMatchObject({ isMember: true, allocatedToTeamHours: 14.4, summary: { effectiveHours: 24 } });
      expect(overview.body.totals).toMatchObject({ effectiveHours: 24, allocatedHours: 24 });
      expect(overview.body.developers).toHaveLength(1);
    });

    it("sinaliza alocação em time do qual a pessoa não participa (§20.5)", async () => {
      await allocate({ teamId: core.id, value: 0.5 }).expect(201);
      const cap = await capacityOf();
      expect(cap.issues).toEqual([expect.objectContaining({ type: "NOT_TEAM_MEMBER" })]);
    });

    it("horas com periodicidade explícita (§20.3)", async () => {
      await allocate({ allocationType: "HOURS", value: 10, description: "Suporte" }).expect(400);
      await allocate({ allocationType: "HOURS", value: 10, period: "WEEK", description: "Suporte" }).expect(201);
      const cap = await capacityOf();
      expect(cap.allocations[0].hours).toBe(10);
      expect(cap.summary.freeHours).toBe(14);
    });

    it("valida percentuais, reserva geral e contexto ativo", async () => {
      await allocate({ teamId: pay.id, value: 1.5 }).expect(400);
      await allocate({ value: 0.2 }).expect(400);
      await api.patch(`/teams/${core.id}`, { status: "INACTIVE", version: 1 }).expect(200);
      await allocate({ teamId: core.id, value: 0.2 }).expect(422);
    });

    it("mudanças preservam histórico e são auditadas (§20.5, RN-038)", async () => {
      const created = (await allocate({ teamId: pay.id, value: 0.5 }).expect(201)).body;
      expect(created.history).toHaveLength(1);
      const updated = (await api.patch(`/capacity/allocations/${created.id}`, { value: 0.8, version: 1 }).expect(200)).body;
      expect(updated).toMatchObject({ value: 0.8, version: 2 });
      expect(updated.history.map((h: { value: number }) => h.value)).toEqual([0.8, 0.5]);
      expect(updated.history[0].changedFields).toEqual(["value"]);
      await api.patch(`/capacity/allocations/${created.id}`, { value: 0.7, version: 1 }).expect(409);
      await api.patch(`/capacity/allocations/${created.id}`, { allocationType: "HOURS", version: 2 }).expect(422);

      // Vigente: encerra-se pela vigência; nunca é apagada (§35.9).
      await api.delete(`/capacity/allocations/${created.id}`).expect(422);
      const ended = (await api.patch(`/capacity/allocations/${created.id}`, { validUntil: TUE, version: 2 }).expect(200)).body;
      expect(ended.validUntil).toBe(TUE);
      expect((await capacityOf()).summary.allocatedHours).toBe(4.8);

      const future = (await allocate({ teamId: pay.id, value: 0.5, validFrom: "2099-01-01" }).expect(201)).body;
      await api.delete(`/capacity/allocations/${future.id}`).expect(204);
      const all = (await api.get(`/capacity/allocations?developerId=${ana.id}&scope=all`).expect(200)).body;
      expect(all).toHaveLength(1);
    });
  });

  describe("estimativas e demanda (§21, §25.5)", () => {
    it("revisões preservam histórico e atualizam o esforço restante (RN-030, CA-022)", async () => {
      const item = await createItem();
      const first = (await api.post(`/work-items/${item.id}/estimates`, { estimatedHours: 16, confidence: "MEDIUM", storyPoints: 5, version: 1 }).expect(201)).body;
      expect(first.estimate).toMatchObject({ estimatedHours: 16, remainingHours: 16, confidence: "MEDIUM", storyPoints: 5 });
      expect(first.tracking.remainingEffortHours).toBe(16);

      const revised = (
        await api
          .post(`/work-items/${item.id}/estimates`, { estimatedHours: 20, remainingHours: 12, confidence: "HIGH", reason: "Escopo detalhado", version: 2 })
          .expect(201)
      ).body;
      expect(revised.estimates.map((e: { estimatedHours: number }) => e.estimatedHours)).toEqual([20, 16]);
      expect(revised.tracking.remainingEffortHours).toBe(12);
      expect(revised.trackingHistory[0].changedFields).toEqual(["remainingEffortHours"]);

      await api.post(`/work-items/${item.id}/estimates`, { estimatedHours: 20, confidence: "HIGH", version: 2 }).expect(409);
      await api.post(`/work-items/${item.id}/estimates`, { estimatedHours: -1, confidence: "HIGH", version: 3 }).expect(400);

      await api.patch(`/work-items/${item.id}`, { executionStatus: "DONE", version: 3 }).expect(200);
      await api.post(`/work-items/${item.id}/estimates`, { estimatedHours: 2, confidence: "HIGH", version: 4 }).expect(422);
    });

    it("demanda do projeto separa vencimentos, itens sem estimativa e concluídos (RN-035, RN-039)", async () => {
      await schedule().expect(201);
      await allocate({ projectId: chk.id, teamId: pay.id, value: 0.5 }).expect(201);
      await createItem({ externalKey: "CHK-1", executingTeamId: pay.id, remainingEffortHours: 10, committedDate: FRI });
      await createItem({ externalKey: "CHK-2", executingTeamId: pay.id, remainingEffortHours: 8, committedDate: "2026-12-01" });
      await createItem({ externalKey: "CHK-3", remainingEffortHours: 4 });
      await createItem({ externalKey: "CHK-4", committedDate: FRI });
      const done = await createItem({ externalKey: "CHK-5", executingTeamId: pay.id, remainingEffortHours: 40, committedDate: FRI });
      await api.patch(`/work-items/${done.id}`, { executionStatus: "DONE", version: 1 }).expect(200);

      const demand = (await api.get(`/projects/${chk.id}/demand?${week}`).expect(200)).body;
      expect(demand.allocatedHours).toBe(15);
      expect(demand.demand).toMatchObject({ openItems: 4, unestimatedItems: 1, dueHours: 10, laterHours: 8, undatedHours: 4, totalHours: 22 });
      expect(demand).toMatchObject({ utilization: 66.7, level: "HEALTHY" });
      expect(demand.items.map((i: { externalKey: string }) => i.externalKey)).toEqual(["CHK-1", "CHK-2", "CHK-3", "CHK-4"]);
      expect(demand.contributors).toEqual([{ developer: { id: ana.id, name: "Ana Lima" }, hours: 15 }]);
      const byPay = demand.byTeam.find((t: { team: { code: string } | null }) => t.team?.code === "PAY");
      expect(byPay).toMatchObject({ allocatedHours: 15, demand: { dueHours: 10 } });

      const team = (await api.get(`/teams/${pay.id}/capacity?${week}`).expect(200)).body;
      expect(team).toMatchObject({ allocatedHours: 15, utilization: 66.7, level: "HEALTHY" });
    });

    it("sprint mostra capacidade planejada × demanda estimada; sem capacidade não há percentual (§5.2.4, §25.5)", async () => {
      const sprint = (await api.post("/sprints", { teamId: pay.id, name: "Sprint 1", startDate: MON, endDate: FRI }).expect(201)).body;
      const item = await createItem({ executingTeamId: pay.id, remainingEffortHours: 20 });
      await api.post(`/sprints/${sprint.id}/items`, { workItemId: item.id }).expect(200);

      let detail = (await api.get(`/sprints/${sprint.id}`).expect(200)).body;
      expect(detail.capacity).toMatchObject({ allocatedHours: 0, utilization: null, level: "NO_CAPACITY", demand: { dueHours: 20 } });

      await schedule().expect(201);
      await allocate({ teamId: pay.id, value: 0.5 }).expect(201);
      detail = (await api.get(`/sprints/${sprint.id}`).expect(200)).body;
      expect(detail.capacity).toMatchObject({ allocatedHours: 15, utilization: 133.3, level: "OVERLOADED" });

      const dashboard = (await api.get("/dashboard").expect(200)).body;
      expect(dashboard.activeSprints).toEqual([]);
      expect(dashboard.capacity.period.from <= dashboard.capacity.period.to).toBe(true);
    });

    it("período fora do horizonte máximo é rejeitado (§25.6)", async () => {
      await api.get(`/capacity?from=2026-01-01&to=2026-12-31`).expect(400);
      await api.get(`/teams/${pay.id}/capacity?from=${SUN}&to=${MON}`).expect(400);
    });
  });
});

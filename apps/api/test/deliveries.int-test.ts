import type { INestApplication } from "@nestjs/common";
import { addDays, todayIn } from "@tlh/shared-contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { resetDatabase, type SignedIn, signedIn, startApp } from "./helpers";

type Ref = { id: string };

describe("Acompanhamento de entregas (integração)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let api: SignedIn;
  let jira: Ref;
  let pay: Ref;
  let core: Ref;
  let chk: Ref;
  let dev: Ref;
  const today = () => todayIn("America/Sao_Paulo");

  beforeAll(async () => {
    ({ app, prisma } = await startApp());
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(prisma);
    api = await signedIn(app);
    [jira] = (await api.post("/external-sources", { name: "Jira", baseUrl: "https://jira.example.com" }).expect(201)).body;
    pay = (await api.post("/teams", { name: "Pagamentos", code: "PAY" }).expect(201)).body;
    core = (await api.post("/teams", { name: "Core", code: "CORE" }).expect(201)).body;
    chk = (await api.post("/projects", { name: "Checkout", code: "CHK" }).expect(201)).body;
    dev = (await api.post("/developers", { name: "Bruno Lima" }).expect(201)).body;
  });

  const createItem = async (body: object = {}) =>
    (
      await api
        .post("/work-items", { sourceId: jira.id, projectId: chk.id, externalKey: "PAY-1", title: "Checkout com Pix", ...body })
        .expect(201)
    ).body;

  describe("itens externos e acompanhamento (§13, §14)", () => {
    it("cadastra sem integração, com origem + identificador únicos (CA-004, RN-005)", async () => {
      const item = await createItem({ executingTeamId: pay.id, developerId: dev.id, externalUrl: "https://jira.example.com/PAY-1" });
      expect(item).toMatchObject({
        externalKey: "PAY-1",
        source: { name: "Jira" },
        project: { code: "CHK" },
        executionStatus: "NOT_STARTED",
        refinementStatus: "NEEDS_REFINEMENT",
        tracking: { executingTeam: { code: "PAY" }, developer: { name: "Bruno Lima" }, stale: false },
      });
      expect(item.refinement.checkItems).toHaveLength(7);

      const dup = await api.post("/work-items", { sourceId: jira.id, projectId: chk.id, externalKey: "PAY-1", title: "Outro" }).expect(409);
      expect(dup.body.details[0].path).toBe("externalKey");
      // A mesma chave em outra origem é permitida.
      const sources = (await api.post("/external-sources", { name: "Azure DevOps" }).expect(201)).body;
      const azure = sources.find((s: { name: string }) => s.name === "Azure DevOps");
      await api.post("/work-items", { sourceId: azure.id, projectId: chk.id, externalKey: "PAY-1", title: "Outro" }).expect(201);
    });

    it("dados insuficientes ficam indeterminados; datas classificam a saúde (RN-012, §14.4)", async () => {
      const unknown = await createItem();
      expect(unknown.tracking).toMatchObject({ calculatedHealth: "UNKNOWN", health: "UNKNOWN", manualHealth: null });

      const late = await createItem({ externalKey: "PAY-2", committedDate: addDays(today(), -1), manualForecastDate: addDays(today(), 3) });
      expect(late.tracking.calculatedHealth).toBe("DELAYED");

      const atRisk = await createItem({ externalKey: "PAY-3", committedDate: addDays(today(), 5), manualForecastDate: addDays(today(), 7) });
      expect(atRisk.tracking.calculatedHealth).toBe("AT_RISK");

      // A avaliação manual é guardada à parte: a calculada continua visível (§14.4).
      const manual = await api.patch(`/work-items/${atRisk.id}`, { manualHealth: "ON_TRACK", version: 1 }).expect(200);
      expect(manual.body.tracking).toMatchObject({ manualHealth: "ON_TRACK", calculatedHealth: "AT_RISK", health: "ON_TRACK" });
    });

    it("mudanças de previsão, responsável e time preservam histórico (CA-006, §14.5)", async () => {
      const item = await createItem({ committedDate: addDays(today(), 10), manualForecastDate: addDays(today(), 8), executingTeamId: pay.id });
      await api.patch(`/work-items/${item.id}`, { manualForecastDate: addDays(today(), 12), version: 1 }).expect(200);
      const moved = await api
        .patch(`/work-items/${item.id}`, { executingTeamId: core.id, developerId: dev.id, statusNote: "Mudou de time", version: 2 })
        .expect(200);
      // Reenviar o mesmo valor não gera histórico novo.
      await api.patch(`/work-items/${item.id}`, { executingTeamId: core.id, version: 3 }).expect(200);

      const history = moved.body.trackingHistory;
      expect(history.map((h: { changedFields: string[] }) => h.changedFields)).toEqual([
        ["executingTeam", "developer", "statusNote"],
        ["manualForecastDate"],
        ["created"],
      ]);
      expect(history[1].manualForecastDate).toBe(addDays(today(), 12));
      expect(history[2]).toMatchObject({ manualForecastDate: addDays(today(), 8), executingTeam: { code: "PAY" } });
      expect(history[0]).toMatchObject({ executingTeam: { code: "CORE" }, developer: { name: "Bruno Lima" } });
      expect((await api.get(`/work-items/${item.id}`).expect(200)).body.trackingHistory).toHaveLength(3);

      await api.patch(`/work-items/${item.id}`, { title: "Outro", version: 1 }).expect(409);
    });

    it("concluir zera o esforço restante e encerra a saúde (§14.5, RN-035)", async () => {
      const item = await createItem({ remainingEffortHours: 12.5, committedDate: addDays(today(), -3) });
      expect(item.tracking.remainingEffortHours).toBe(12.5);
      const done = await api.patch(`/work-items/${item.id}`, { executionStatus: "DONE", version: 1 }).expect(200);
      expect(done.body).toMatchObject({ executionStatus: "DONE", tracking: { remainingEffortHours: 0, health: null, stale: false } });
      expect(done.body.completedAt).not.toBeNull();
      await api.patch(`/work-items/${item.id}`, { remainingEffortHours: -1, version: 2 }).expect(400);
    });

    it("sinaliza acompanhamento desatualizado e registra verificação (§14.5)", async () => {
      const item = await createItem({ executingTeamId: pay.id });
      await prisma.deliveryTracking.update({
        where: { workItemId: item.id },
        data: { lastCheckedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      });
      const stale = await api.get(`/work-items?stale=true`).expect(200);
      expect(stale.body).toMatchObject({ total: 1, items: [{ id: item.id, tracking: { stale: true } }] });

      const checked = await api.post(`/work-items/${item.id}/check`).expect(200);
      expect(checked.body).toMatchObject({ tracking: { stale: false }, version: 1 });
      expect((await api.get(`/work-items?stale=true`).expect(200)).body.total).toBe(0);
    });

    it("consulta por time, projeto, desenvolvedor e pagina (§14.2, RNF-009)", async () => {
      await createItem({ externalKey: "PAY-1", executingTeamId: pay.id, developerId: dev.id });
      await createItem({ externalKey: "PAY-2", executingTeamId: core.id });
      await createItem({ externalKey: "PAY-10", executingTeamId: pay.id });

      expect((await api.get(`/work-items?teamId=${pay.id}`).expect(200)).body.total).toBe(2);
      expect((await api.get(`/work-items?developerId=${dev.id}`).expect(200)).body.total).toBe(1);
      expect((await api.get(`/work-items?projectId=${chk.id}&q=pay-1`).expect(200)).body.total).toBe(2);
      const page = await api.get("/work-items?pageSize=2&page=2").expect(200);
      expect(page.body).toMatchObject({ total: 3, page: 2, pageSize: 2 });
      expect(page.body.items.map((i: { externalKey: string }) => i.externalKey)).toEqual(["PAY-10"]);
    });

    it("recusa time inativo e projeto arquivado em novos vínculos (§7.4, §8.5)", async () => {
      const item = await createItem({ executingTeamId: pay.id });
      await api.patch(`/teams/${pay.id}`, { status: "INACTIVE", version: 1 }).expect(200);
      // O vínculo antigo continua válido ao editar outros campos.
      await api.patch(`/work-items/${item.id}`, { title: "Checkout com Pix v2", version: 1 }).expect(200);
      await api.post("/work-items", { sourceId: jira.id, projectId: chk.id, externalKey: "X-1", title: "Novo", executingTeamId: pay.id }).expect(422);
      await api.patch(`/projects/${chk.id}`, { status: "ARCHIVED", version: 1 }).expect(200);
      await api.post("/work-items", { sourceId: jira.id, projectId: chk.id, externalKey: "X-2", title: "Novo" }).expect(422);
    });
  });

  describe("refinamento (§15)", () => {
    it("é independente da execução e pronto com checklist incompleto exige justificativa (CA-005, §15.5)", async () => {
      const item = await createItem({ executionStatus: "IN_PROGRESS" });
      const refining = await api.patch(`/work-items/${item.id}/refinement`, { status: "ANALYZING", version: 1 }).expect(200);
      expect(refining.body).toMatchObject({ executionStatus: "IN_PROGRESS", refinementStatus: "ANALYZING" });

      const refused = await api.patch(`/work-items/${item.id}/refinement`, { status: "READY", version: 2 }).expect(422);
      expect(refused.body.details[0].path).toBe("readyExceptionReason");
      const ready = await api
        .patch(`/work-items/${item.id}/refinement`, { status: "READY", readyExceptionReason: "Estimativa vem depois", version: 2 })
        .expect(200);
      expect(ready.body.refinement).toMatchObject({ status: "READY", readyExceptionReason: "Estimativa vem depois" });
      expect(ready.body.trackingHistory[0].changedFields).toEqual(["refinementStatus"]);
    });

    it("checklist completo sugere pronto sem aplicar; itens são configuráveis (§15.4)", async () => {
      const item = await createItem();
      let detail = item;
      for (const check of item.refinement.checkItems.slice(1)) {
        detail = (await api.patch(`/refinement-check-items/${check.id}`, { checked: true }).expect(200)).body;
      }
      detail = (await api.delete(`/refinement-check-items/${item.refinement.checkItems[0].id}`).expect(200)).body;
      expect(detail.refinement).toMatchObject({ suggestReady: true, status: "NEEDS_REFINEMENT", checklist: { total: 6, checked: 6 } });

      detail = (await api.post(`/work-items/${item.id}/refinement/check-items`, { label: "Contrato revisado" }).expect(200)).body;
      expect(detail.refinement).toMatchObject({ suggestReady: false, checklist: { total: 7, checked: 6 } });
      expect(detail.refinement.checkItems.at(-1).label).toBe("Contrato revisado");
    });

    it("alerta item não pronto para sprint iminente no pipeline (§15.5)", async () => {
      const item = await createItem({ executingTeamId: pay.id });
      const sprint = (
        await api
          .post("/sprints", { teamId: pay.id, name: "Sprint 42", startDate: addDays(today(), 2), endDate: addDays(today(), 16) })
          .expect(201)
      ).body;
      await api.patch(`/work-items/${item.id}/refinement`, { intendedSprintId: sprint.id, version: 1 }).expect(200);
      const pipeline = await api.get(`/refinements?teamId=${pay.id}`).expect(200);
      expect(pipeline.body[0]).toMatchObject({ notReadyForImminentSprint: true, intendedSprint: { name: "Sprint 42" } });
      expect((await api.get(`/refinements?sprintId=${sprint.id}`).expect(200)).body).toHaveLength(1);
    });
  });

  describe("sprints (§11)", () => {
    const createSprint = async (name: string, offset = 0) =>
      (
        await api
          .post("/sprints", { teamId: pay.id, name, startDate: addDays(today(), offset), endDate: addDays(today(), offset + 13) })
          .expect(201)
      ).body;

    it("remaneja preservando histórico e no máximo uma associação corrente (CA-007, RN-010, RN-020)", async () => {
      const a = await createSprint("Sprint 1");
      const b = await createSprint("Sprint 2", 14);
      const item = await createItem();

      const inA = await api.post(`/sprints/${a.id}/items`, { workItemId: item.id }).expect(200);
      expect(inA.body.items[0]).toMatchObject({ scopeType: "ORIGINAL" });
      const conflict = await api.post(`/sprints/${b.id}/items`, { workItemId: item.id }).expect(409);
      expect(conflict.body.message).toContain("Sprint 1");

      const inB = await api.post(`/sprints/${b.id}/items`, { workItemId: item.id, move: true }).expect(200);
      expect(inB.body.items[0]).toMatchObject({ scopeType: "MOVED" });
      const left = await api.get(`/sprints/${a.id}`).expect(200);
      expect(left.body).toMatchObject({ items: [], summary: { original: 1, movedOut: 1 } });
      expect(left.body.departed[0]).toMatchObject({ exitReason: "MOVED" });

      const detail = await api.get(`/work-items/${item.id}`).expect(200);
      expect(detail.body.currentSprint).toMatchObject({ name: "Sprint 2", scopeType: "MOVED" });
      expect(detail.body.sprintHistory.map((m: { sprint: { name: string } }) => m.sprint.name)).toEqual(["Sprint 2", "Sprint 1"]);
      expect(await prisma.sprintMembership.count({ where: { workItemId: item.id, exitedAt: null } })).toBe(1);
    });

    it("encerrar não conclui histórias e pendentes viram remanejadas na próxima (CA-009, RN-011)", async () => {
      const sprint = await createSprint("Sprint 1", -7);
      const next = await createSprint("Sprint 2", 7);
      const done = await createItem({ externalKey: "PAY-1" });
      const pending = await createItem({ externalKey: "PAY-2" });
      await api.post(`/sprints/${sprint.id}/items`, { workItemId: done.id }).expect(200);
      await api.patch(`/sprints/${sprint.id}`, { status: "ACTIVE", version: 1 }).expect(200);
      const added = await api.post(`/sprints/${sprint.id}/items`, { workItemId: pending.id }).expect(200);
      expect(added.body.items.map((i: { scopeType: string }) => i.scopeType)).toEqual(["ORIGINAL", "ADDED"]);
      await api.patch(`/work-items/${done.id}`, { executionStatus: "DONE", version: 1 }).expect(200);

      await api.post(`/sprints/${sprint.id}/close`, { version: 1 }).expect(409);
      const closed = await api.post(`/sprints/${sprint.id}/close`, { version: 2 }).expect(200);
      expect(closed.body).toMatchObject({ status: "CLOSED", summary: { original: 1, added: 1, completed: 1, pending: 1 } });
      expect(closed.body.counts).toMatchObject({ total: 2, done: 1 });
      expect((await api.get(`/work-items/${pending.id}`).expect(200)).body).toMatchObject({
        executionStatus: "NOT_STARTED",
        currentSprint: null,
      });
      expect(closed.body.history[0]).toMatchObject({ action: "sprint.closed", toStatus: "CLOSED" });

      await api.post(`/sprints/${sprint.id}/items`, { workItemId: pending.id }).expect(422);
      const carried = await api.post(`/sprints/${next.id}/items`, { workItemId: pending.id }).expect(200);
      expect(carried.body.items[0].scopeType).toBe("MOVED");
      // Itens concluídos não entram em novos planejamentos.
      await api.post(`/sprints/${next.id}/items`, { workItemId: done.id }).expect(422);
    });

    it("pertence a um time ativo e aceita itens de vários projetos (RN-016, RN-019)", async () => {
      const api2 = (await api.post("/projects", { name: "API", code: "API" }).expect(201)).body;
      const sprint = await createSprint("Sprint 1");
      const a = await createItem({ externalKey: "PAY-1" });
      const b = await createItem({ externalKey: "API-1", projectId: api2.id });
      await api.post(`/sprints/${sprint.id}/items`, { workItemId: a.id }).expect(200);
      await api.post(`/sprints/${sprint.id}/items`, { workItemId: b.id }).expect(200);
      expect((await api.get(`/sprints?projectId=${api2.id}`).expect(200)).body).toHaveLength(1);
      await api.patch(`/teams/${core.id}`, { status: "INACTIVE", version: 1 }).expect(200);
      await api.post("/sprints", { teamId: core.id, name: "Sprint X", startDate: today(), endDate: today() }).expect(422);
    });
  });

  describe("releases (§12)", () => {
    it("reúne itens de vários times, sem duplicar, e preserva histórico de previsão (CA-008, RN-009, §12.5)", async () => {
      const release = (
        await api
          .post("/releases", { projectId: chk.id, name: "Checkout 2.0", committedDate: addDays(today(), 20), forecastDate: addDays(today(), 18) })
          .expect(201)
      ).body;
      const other = (await api.post("/releases", { projectId: chk.id, name: "Checkout 2.1" }).expect(201)).body;
      const a = await createItem({ externalKey: "PAY-1", executingTeamId: pay.id });
      const b = await createItem({ externalKey: "CORE-1", executingTeamId: core.id });
      await api.post(`/releases/${release.id}/items`, { workItemId: a.id }).expect(200);
      await api.post(`/releases/${release.id}/items`, { workItemId: b.id, isRequired: false }).expect(200);
      await api.post(`/releases/${release.id}/items`, { workItemId: a.id }).expect(409);
      await api.post(`/releases/${other.id}/items`, { workItemId: a.id }).expect(200);

      const detail = await api.get(`/releases/${release.id}`).expect(200);
      expect(detail.body.teams.map((t: { code: string }) => t.code)).toEqual(["CORE", "PAY"]);
      // Sem estimativas, as horas não são inventadas: o item conta como não estimado (§3.4).
      expect(detail.body.progress).toEqual({
        required: 1,
        requiredDone: 0,
        optional: 1,
        optionalDone: 0,
        requiredRemainingHours: 0,
        requiredUnestimated: 1,
      });
      expect((await api.get(`/work-items/${a.id}`).expect(200)).body.releases).toHaveLength(2);
      expect((await api.get(`/releases?teamId=${pay.id}`).expect(200)).body).toHaveLength(2);

      const moved = await api.patch(`/releases/${release.id}`, { forecastDate: addDays(today(), 25), version: 1 }).expect(200);
      expect(moved.body.health).toBe("AT_RISK");
      expect(moved.body.forecastHistory.map((h: { forecastDate: string }) => h.forecastDate)).toEqual([
        addDays(today(), 25),
        addDays(today(), 18),
      ]);

      const removed = await api.post(`/releases/${release.id}/items/${b.id}/remove`).expect(200);
      expect(removed.body.removed[0].workItem.externalKey).toBe("CORE-1");
      expect(removed.body.teams.map((t: { code: string }) => t.code)).toEqual(["PAY"]);
    });

    it("impedimento em item obrigatório bloqueia a release; encerrada preserva escopo", async () => {
      const release = (
        await api
          .post("/releases", { projectId: chk.id, name: "Checkout 2.0", committedDate: addDays(today(), 20), forecastDate: addDays(today(), 18) })
          .expect(201)
      ).body;
      const item = await createItem();
      await api.post(`/releases/${release.id}/items`, { workItemId: item.id }).expect(200);
      expect((await api.get(`/releases/${release.id}`).expect(200)).body.health).toBe("ON_TRACK");

      await api.post("/risks", { title: "Gateway fora", type: "IMPEDIMENT", links: { workItemIds: [item.id] } }).expect(201);
      const blocked = await api.get(`/releases/${release.id}`).expect(200);
      expect(blocked.body).toMatchObject({ health: "BLOCKED", openRiskCount: 1 });

      const milestone = await api.post(`/releases/${release.id}/milestones`, { name: "Homologação", targetDate: addDays(today(), 10) }).expect(200);
      const done = await api.patch(`/release-milestones/${milestone.body.milestones[0].id}`, { completed: true }).expect(200);
      expect(done.body.milestones[0].completedAt).not.toBeNull();

      const released = await api.patch(`/releases/${release.id}`, { status: "RELEASED", version: 1 }).expect(200);
      expect(released.body).toMatchObject({ status: "RELEASED", health: null });
      expect(released.body.closedAt).not.toBeNull();
      await api.post(`/releases/${release.id}/items/${item.id}/remove`).expect(422);
    });
  });

  describe("riscos e impedimentos (§16)", () => {
    it("impedimento total bloqueia a entrega e resolvido continua consultável (RN-008)", async () => {
      const item = await createItem({ committedDate: addDays(today(), 10), manualForecastDate: addDays(today(), 8), executingTeamId: pay.id });
      const task = (await api.post("/tasks", { title: "Cobrar fornecedor", workItemIds: [item.id] }).expect(201)).body;
      expect(task.workItems).toEqual([{ id: item.id, externalKey: "PAY-1", title: "Checkout com Pix" }]);

      const risk = (
        await api
          .post("/risks", {
            title: "Fornecedor sem homologação",
            type: "IMPEDIMENT",
            severity: "HIGH",
            links: { workItemIds: [item.id], projectIds: [chk.id], taskIds: [task.id] },
          })
          .expect(201)
      ).body;
      expect(risk).toMatchObject({ blockingLevel: "FULL", status: "OPEN", identifiedAt: today() });
      expect((await api.get(`/work-items/${item.id}`).expect(200)).body.tracking.calculatedHealth).toBe("BLOCKED");
      expect((await api.get(`/risks?teamId=${pay.id}`).expect(200)).body).toHaveLength(1);

      const partial = await api.patch(`/risks/${risk.id}`, { blockingLevel: "PARTIAL", version: 1 }).expect(200);
      expect(partial.body.blockingLevel).toBe("PARTIAL");
      expect((await api.get(`/work-items/${item.id}`).expect(200)).body.tracking.calculatedHealth).toBe("AT_RISK");

      const resolved = await api.patch(`/risks/${risk.id}`, { status: "RESOLVED", resolutionNote: "Homologado", version: 2 }).expect(200);
      expect(resolved.body.resolvedAt).not.toBeNull();
      expect(resolved.body.history[0]).toMatchObject({ fromStatus: "OPEN", toStatus: "RESOLVED" });
      expect((await api.get(`/work-items/${item.id}`).expect(200)).body.tracking.calculatedHealth).toBe("ON_TRACK");
      // Resolver não conclui a atividade associada (§16.4).
      expect((await api.get(`/tasks/${task.id}`).expect(200)).body.status).toBe("TODO");
      expect((await api.get("/risks").expect(200)).body).toHaveLength(0);
      expect((await api.get("/risks?scope=closed").expect(200)).body).toHaveLength(1);
    });

    it("só impedimentos têm nível de bloqueio e vínculos são do workspace", async () => {
      const risk = (await api.post("/risks", { title: "Pico de demanda", severity: "LOW" }).expect(201)).body;
      expect(risk.blockingLevel).toBeNull();
      const changed = await api.patch(`/risks/${risk.id}`, { blockingLevel: "FULL", version: 1 }).expect(200);
      expect(changed.body.blockingLevel).toBeNull();
      await api.post("/risks", { title: "Outro", links: { workItemIds: [crypto.randomUUID()] } }).expect(422);
    });
  });

  describe("diário de bordo (§17)", () => {
    it("registra com data padrão, recusa duplicado e filtra por contexto (§17.4)", async () => {
      const sprint = (await api.post("/sprints", { teamId: pay.id, name: "Sprint 1", startDate: today(), endDate: today() }).expect(201)).body;
      const entry = (
        await api.post("/journal", { category: "TECH_DECISION", description: "Adotar fila para webhooks", links: { sprintIds: [sprint.id] } }).expect(201)
      ).body;
      expect(entry).toMatchObject({ occurredOn: today(), links: { sprints: [{ name: "Sprint 1" }] } });
      await api.post("/journal", { category: "TECH_DECISION", description: "Adotar fila para webhooks" }).expect(409);
      await api.post("/journal", { category: "INCIDENT", description: "Queda no gateway", occurredOn: addDays(today(), -2), links: { projectIds: [chk.id] } }).expect(201);

      expect((await api.get(`/journal?teamId=${pay.id}`).expect(200)).body).toMatchObject({ total: 1 });
      expect((await api.get(`/journal?projectId=${chk.id}`).expect(200)).body.items[0].category).toBe("INCIDENT");
      const timeline = await api.get(`/journal?from=${addDays(today(), -3)}`).expect(200);
      expect(timeline.body.items.map((e: { category: string }) => e.category)).toEqual(["TECH_DECISION", "INCIDENT"]);
      expect((await api.get("/journal?category=INCIDENT").expect(200)).body.total).toBe(1);

      // O diário continua disponível após o encerramento da sprint (§11.6).
      await api.patch(`/sprints/${sprint.id}`, { status: "ACTIVE", version: 1 }).expect(200);
      await api.post(`/sprints/${sprint.id}/close`, { version: 2 }).expect(200);
      expect((await api.get(`/journal?sprintId=${sprint.id}`).expect(200)).body.total).toBe(1);

      const edited = await api.patch(`/journal/${entry.id}`, { description: "Adotar fila SQS para webhooks", version: 1 }).expect(200);
      expect(edited.body.version).toBe(2);
      await api.post("/journal", { description: "Sem categoria" }).expect(400);
    });
  });

  describe("dashboard (§5.2.3–§5.2.6)", () => {
    it("consolida entregas sem duplicar e respeita o contexto (CA-010, §5.4)", async () => {
      const blocked = await createItem({ externalKey: "PAY-1", executingTeamId: pay.id, committedDate: addDays(today(), 5) });
      const late = await createItem({ externalKey: "CORE-1", executingTeamId: core.id, committedDate: addDays(today(), -1) });
      await createItem({
        externalKey: "PAY-2",
        executingTeamId: pay.id,
        committedDate: addDays(today(), 5),
        manualForecastDate: addDays(today(), 9),
      });
      await api.post("/risks", { title: "Bloqueio", type: "IMPEDIMENT", links: { workItemIds: [blocked.id], teamIds: [pay.id] } }).expect(201);
      const sprint = (await api.post("/sprints", { teamId: pay.id, name: "Sprint 1", startDate: today(), endDate: addDays(today(), 13) }).expect(201)).body;
      await api.post(`/sprints/${sprint.id}/items`, { workItemId: blocked.id }).expect(200);
      await api.patch(`/sprints/${sprint.id}`, { status: "ACTIVE", version: 1 }).expect(200);
      // A mesma entrega em duas releases conta uma vez.
      for (const name of ["R1", "R2"]) {
        const release = (await api.post("/releases", { projectId: chk.id, name }).expect(201)).body;
        await api.post(`/releases/${release.id}/items`, { workItemId: late.id }).expect(200);
      }

      const global = (await api.get("/dashboard").expect(200)).body;
      expect(global.deliveries.openCount).toBe(3);
      expect(global.deliveries.blocked.items.map((i: { id: string }) => i.id)).toEqual([blocked.id]);
      expect(global.deliveries.delayed.items.map((i: { id: string }) => i.id)).toEqual([late.id]);
      expect(global.deliveries.forecastAfterCommitment.total).toBe(1);
      expect(global.activeSprints[0]).toMatchObject({ name: "Sprint 1", counts: { total: 1, blocked: 1, openRisks: 1 } });
      expect(global.releases).toHaveLength(2);
      expect(global.refinement).toMatchObject({ needsRefinement: 3, checklistIncomplete: 3 });
      expect(global.refinement.notReadyForImminentSprint.items[0].workItem.id).toBe(blocked.id);

      const contextual = (await api.get(`/dashboard?teamId=${core.id}`).expect(200)).body;
      expect(contextual.deliveries.openCount).toBe(1);
      expect(contextual.activeSprints).toHaveLength(0);
      expect(contextual.releases).toHaveLength(2);
    });
  });
});

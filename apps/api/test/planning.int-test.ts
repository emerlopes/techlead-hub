import type { INestApplication } from "@nestjs/common";
import { addDays, todayIn, weekdayIndex } from "@tlh/shared-contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { resetDatabase, type SignedIn, signedIn, startApp } from "./helpers";

type Ref = { id: string };
type Item = { id: string; workItem: { externalKey: string }; projection: { state: string; startDate: string | null; finishDate: string | null } };

// Semana útil seguinte a hoje: a projeção começa hoje, então o plano inteiro fica no futuro.
const today = todayIn("America/Sao_Paulo");
const MON = addDays(today, 7 - weekdayIndex(today));
const TUE = addDays(MON, 1);
const WED = addDays(MON, 2);
const THU = addDays(MON, 3);
const FRI = addDays(MON, 4);
const week = { startDate: MON, endDate: FRI };

describe("Planejamento de execução (integração)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let api: SignedIn;
  let pay: Ref;
  let chk: Ref;
  let auth: Ref;
  let ana: Ref;
  let bia: Ref;
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
    auth = (await api.post("/projects", { name: "Autenticação", code: "AUTH" }).expect(201)).body;
    ana = (await api.post("/developers", { name: "Ana Lima" }).expect(201)).body;
    bia = (await api.post("/developers", { name: "Bia Rocha" }).expect(201)).body;
    [jira] = (await api.post("/external-sources", { name: "Jira" }).expect(201)).body;
    for (const dev of [ana, bia]) {
      await api.post("/team-developers", { teamId: pay.id, developerId: dev.id }).expect(201);
      await api
        .post("/capacity/schedules", { developerId: dev.id, validFrom: "2026-01-01", weeklyPattern: [8, 8, 8, 8, 8, 0, 0], focusFactor: 1 })
        .expect(201);
    }
  });

  const allocate = (body: object) =>
    api.post("/capacity/allocations", { developerId: ana.id, allocationType: "PERCENTAGE", validFrom: "2026-01-01", ...body }).expect(201);
  let seq = 0;
  const createItem = async (body: object = {}) =>
    (
      await api
        .post("/work-items", { sourceId: jira.id, projectId: chk.id, externalKey: `CHK-${++seq}`, title: "Entrega", ...body })
        .expect(201)
    ).body as Ref & { externalKey: string };
  const createPlan = (body: object) =>
    api.post("/execution-plans", { developerId: ana.id, teamId: pay.id, projectId: chk.id, period: week, ...body });
  const plan = async (id: string) => (await api.get(`/execution-plans/${id}`).expect(200)).body;
  const byKey = (detail: { items: Item[] }, key: string) => detail.items.find((i) => i.workItem.externalKey === key) as Item;

  it("contrato do §37: híbrido 70/30 consome só a capacidade alocada ao contexto", async () => {
    await allocate({ teamId: pay.id, projectId: chk.id, value: 0.5 });
    await allocate({ teamId: pay.id, projectId: auth.id, value: 0.5 });
    const a = await createItem({ remainingEffortHours: 14 });
    const b = await createItem({ remainingEffortHours: 6 });

    const created = (
      await createPlan({
        executionMode: "HYBRID",
        maxParallelItems: 2,
        redistributionPolicy: "SAME_CONTEXT",
        items: [
          { workItemId: b.id, position: 2, capacityShare: 0.3 },
          { workItemId: a.id, position: 1, capacityShare: 0.7 },
        ],
      }).expect(201)
    ).body;
    expect(created).toMatchObject({ status: "ACTIVE", executionMode: "HYBRID", itemCount: 2, version: 1 });
    expect(created.items.map((i: Item) => i.workItem.externalKey)).toEqual([a.externalKey, b.externalKey]);
    // 50% de 8 h = 4 h/dia no contexto PAY/CHK; a alocação de AUTH não entra (RN-026).
    expect(created.projection).toMatchObject({ capacityHours: 20, plannedHours: 20, idleHours: 0, complete: true });
    expect(created.contextAllocations).toHaveLength(1);
    expect(created.contextAllocations[0].hours).toBe(20);
    expect(byKey(created, a.externalKey).projection).toMatchObject({ state: "COMPLETES", startDate: MON });
    expect(created.issues).toEqual([]);
    expect(created.history[0]).toMatchObject({ action: "execution_plan.created", toStatus: "ACTIVE" });
  });

  it("paralelismo: 100% é válido (CA-013) e acima é rejeitado (CA-014)", async () => {
    await allocate({ teamId: pay.id, projectId: chk.id, value: 1 });
    const a = await createItem({ remainingEffortHours: 8 });
    const b = await createItem({ remainingEffortHours: 8 });
    const items = [
      { workItemId: a.id, capacityShare: 0.6 },
      { workItemId: b.id, capacityShare: 0.5 },
    ];
    const rejected = await createPlan({ executionMode: "PARALLEL", items }).expect(400);
    expect(rejected.body.details[0]).toMatchObject({ path: "items" });

    const ok = (await createPlan({ executionMode: "PARALLEL", items: [items[0], { ...items[1], capacityShare: 0.4 }] }).expect(201)).body;
    expect(ok.maxParallelItems).toBe(2);
    const over = await api.patch(`/execution-plans/${ok.id}`, { items: [items[0], items[1]], version: 1 }).expect(422);
    expect(over.body.details[0].path).toBe("items");
  });

  it("sequencial: a entrega concluída libera capacidade para a próxima (CA-012, RN-035)", async () => {
    await allocate({ teamId: pay.id, projectId: chk.id, value: 1 });
    const a = await createItem({ remainingEffortHours: 16 });
    const b = await createItem({ remainingEffortHours: 8 });
    const created = (await createPlan({ items: [{ workItemId: a.id }, { workItemId: b.id }] }).expect(201)).body;
    expect(created).toMatchObject({ executionMode: "SEQUENTIAL", maxParallelItems: 1, redistributionPolicy: "SAME_CONTEXT" });
    expect(byKey(created, b.externalKey).projection).toMatchObject({ startDate: WED, finishDate: WED });

    await api.patch(`/work-items/${a.id}`, { executionStatus: "DONE", version: 1 }).expect(200);
    const after = await plan(created.id);
    expect(byKey(after, a.externalKey).projection.state).toBe("DONE");
    expect(byKey(after, b.externalKey).projection).toMatchObject({ startDate: MON, finishDate: MON });
    expect(after.openItemCount).toBe(1);
  });

  it("dependências: Finish-to-Start respeitado (CA-016), ciclos rejeitados (CA-017) e externa sem data indeterminada (CA-018)", async () => {
    await allocate({ teamId: pay.id, projectId: chk.id, value: 1 });
    const a = await createItem({ remainingEffortHours: 8 });
    const b = await createItem({ remainingEffortHours: 8 });
    const c = await createItem({ remainingEffortHours: 8 });
    // a depende de b, mesmo estando antes na fila.
    await api.post("/work-dependencies", { dependencyType: "FINISH_TO_START", predecessorId: b.id, successorId: a.id }).expect(201);
    await api.post("/work-dependencies", { dependencyType: "FINISH_TO_START", predecessorId: c.id, successorId: b.id }).expect(201);
    const cycle = await api.post("/work-dependencies", { dependencyType: "START_TO_START", predecessorId: a.id, successorId: c.id }).expect(422);
    expect(cycle.body.message).toContain("CA-017");
    await api.post("/work-dependencies", { dependencyType: "FINISH_TO_START", predecessorId: a.id, successorId: a.id }).expect(400);
    await api.post("/work-dependencies", { dependencyType: "FINISH_TO_START", predecessorId: b.id, successorId: a.id }).expect(409);
    // Informativa não entra no grafo de agendamento nem no cálculo (§24.4).
    await api.post("/work-dependencies", { dependencyType: "INFORMATIONAL", predecessorId: a.id, successorId: c.id }).expect(201);

    const created = (await createPlan({ items: [a, b, c].map((i) => ({ workItemId: i.id })) }).expect(201)).body;
    expect(byKey(created, c.externalKey).projection).toMatchObject({ startDate: MON, finishDate: MON });
    expect(byKey(created, b.externalKey).projection).toMatchObject({ startDate: TUE, finishDate: TUE });
    expect(byKey(created, a.externalKey).projection).toMatchObject({ startDate: WED, finishDate: WED });
    expect(created.issues.map((i: { type: string }) => i.type)).toContain("DEPENDENCY_ORDER");

    // Externa sem data: o item não recebe data (CA-018); com data, começa nela; liberada, deixa de restringir.
    const external = (
      await api.post("/work-dependencies", { dependencyType: "EXTERNAL", externalReference: "API do parceiro", successorId: c.id }).expect(201)
    ).body;
    expect(external).toMatchObject({ state: "UNKNOWN", predecessor: null });
    let detail = await plan(created.id);
    expect(byKey(detail, c.externalKey).projection).toMatchObject({ state: "WAITING_DEPENDENCY", startDate: null, finishDate: null });
    expect(byKey(detail, a.externalKey).projection.state).toBe("WAITING_DEPENDENCY");
    expect(detail.projection.complete).toBe(false);
    expect(detail.issues.map((i: { type: string }) => i.type)).toContain("DEPENDENCY_UNKNOWN");

    await api.patch(`/work-dependencies/${external.id}`, { expectedReleaseDate: THU, version: 1 }).expect(200);
    detail = await plan(created.id);
    expect(byKey(detail, c.externalKey).projection).toMatchObject({ startDate: THU, finishDate: THU });

    const released = (await api.post(`/work-dependencies/${external.id}/release`, { version: 2 }).expect(200)).body;
    expect(released).toMatchObject({ status: "RELEASED", state: "RELEASED", actualReleaseDate: today });
    expect(byKey(await plan(created.id), c.externalKey).projection.startDate).toBe(MON);
    expect((await api.get(`/work-dependencies?workItemId=${c.id}`).expect(200)).body.map((d: { id: string }) => d.id)).not.toContain(external.id);
    expect((await api.get(`/work-dependencies?workItemId=${c.id}&scope=all`).expect(200)).body).toHaveLength(3);

    const toRemove = (await api.get(`/work-dependencies?workItemId=${a.id}`).expect(200)).body.find(
      (d: { dependencyType: string }) => d.dependencyType === "INFORMATIONAL",
    );
    await api.delete(`/work-dependencies/${toRemove.id}`).expect(204);
    const audit = await prisma.auditEvent.count({ where: { entityType: "work_dependency" } });
    expect(audit).toBe(7);
  });

  it("bloqueio total não consome capacidade; responsável diferente é sinalizado", async () => {
    await allocate({ teamId: pay.id, projectId: chk.id, value: 1 });
    const a = await createItem({ remainingEffortHours: 8, developerId: bia.id });
    const b = await createItem({ remainingEffortHours: 8 });
    await api.post("/risks", { title: "Gateway fora", type: "IMPEDIMENT", links: { workItemIds: [a.id] } }).expect(201);
    const created = (await createPlan({ items: [{ workItemId: a.id }, { workItemId: b.id }] }).expect(201)).body;
    expect(byKey(created, a.externalKey).projection.state).toBe("BLOCKED");
    expect(byKey(created, b.externalKey).projection).toMatchObject({ startDate: MON, finishDate: MON });
    expect(created.items[0].workItem.blocking).toBe("FULL");
    expect(created.issues.map((i: { type: string }) => i.type)).toEqual(["BLOCKED", "ASSIGNEE_MISMATCH"]);
  });

  it("CROSS_CONTEXT redistribui entre contextos da mesma pessoa só quando os dois autorizam (§23)", async () => {
    await allocate({ teamId: pay.id, projectId: chk.id, value: 0.5 });
    await allocate({ teamId: pay.id, projectId: auth.id, value: 0.5 });
    const small = await createItem({ remainingEffortHours: 4 });
    const big = await createItem({ projectId: auth.id, externalKey: "AUTH-1", remainingEffortHours: 30 });
    const giver = (await createPlan({ redistributionPolicy: "CROSS_CONTEXT", items: [{ workItemId: small.id }] }).expect(201)).body;
    const taker = (
      await createPlan({ projectId: auth.id, redistributionPolicy: "SAME_CONTEXT", items: [{ workItemId: big.id }] }).expect(201)
    ).body;
    expect(taker.projection.receivedHours).toBe(0);
    expect((await plan(giver.id)).projection.donatedHours).toBe(0);

    await api.patch(`/execution-plans/${taker.id}`, { redistributionPolicy: "CROSS_CONTEXT", version: 1 }).expect(200);
    const after = await plan(taker.id);
    // CHK tem 4 h/dia e só usa 4 h na segunda: de terça a quinta cede 12 h, e AUTH conclui as 30 h na sexta.
    expect(after.projection).toMatchObject({ capacityHours: 20, receivedHours: 12, plannedHours: 30 });
    expect(after.items[0].projection).toMatchObject({ state: "COMPLETES", finishDate: FRI, redistributedHours: 12 });
    expect((await plan(giver.id)).projection).toMatchObject({ donatedHours: 12, idleHours: 4 });
  });

  it("um plano ativo por contexto, item em um só plano ativo e rascunho livre (RN-026)", async () => {
    await allocate({ teamId: pay.id, projectId: chk.id, value: 1 });
    const a = await createItem({ remainingEffortHours: 8 });
    const first = (await createPlan({ items: [{ workItemId: a.id }] }).expect(201)).body;
    await createPlan({}).expect(409);
    const draft = (await createPlan({ status: "DRAFT", items: [{ workItemId: a.id }] }).expect(201)).body;
    expect(draft.status).toBe("DRAFT");
    // Rascunho é projetado isolado, com a mesma capacidade do contexto.
    expect(draft.projection.capacityHours).toBe(40);

    const other = (await createPlan({ teamId: null, projectId: null, items: [] }).expect(201)).body;
    expect(other.issues).toEqual([]);
    const twice = await api.patch(`/execution-plans/${other.id}`, { items: [{ workItemId: a.id }], version: 1 }).expect(422);
    expect(twice.body.message).toContain("Ana Lima");

    await api.patch(`/execution-plans/${draft.id}`, { status: "ACTIVE", version: 1 }).expect(409);
    await api.patch(`/execution-plans/${first.id}`, { status: "ARCHIVED", version: 1 }).expect(200);
    await api.patch(`/execution-plans/${first.id}`, { notes: "x", version: 2 }).expect(422);
    await api.patch(`/execution-plans/${draft.id}`, { status: "ACTIVE", version: 1 }).expect(200);
    await api.patch(`/execution-plans/${draft.id}`, { status: "DRAFT", version: 1 }).expect(409);

    const archived = await plan(first.id);
    expect(archived.projection).toBeNull();
    expect(archived.history[0]).toMatchObject({ fromStatus: "ACTIVE", toStatus: "ARCHIVED" });
    expect((await api.get("/execution-plans").expect(200)).body).toHaveLength(2);
    expect((await api.get("/execution-plans?scope=archived").expect(200)).body).toHaveLength(1);
    expect((await api.get(`/execution-plans?workItemId=${a.id}&scope=all`).expect(200)).body).toHaveLength(2);
  });

  it("valida a fila: item encerrado, fora do projeto do contexto, contexto sem capacidade e reordenação", async () => {
    const done = await createItem({ executionStatus: "DONE" });
    const other = await createItem({ projectId: auth.id, externalKey: "AUTH-9" });
    const a = await createItem({ remainingEffortHours: 8 });
    const b = await createItem();

    expect((await createPlan({ items: [{ workItemId: done.id }] }).expect(422)).body.details[0].path).toBe("items.0.workItemId");
    expect((await createPlan({ items: [{ workItemId: other.id }] }).expect(422)).body.message).toContain("AUTH");
    await createPlan({ period: { startDate: FRI, endDate: MON } }).expect(400);

    const created = (await createPlan({ items: [{ workItemId: a.id }, { workItemId: b.id }] }).expect(201)).body;
    // Sem alocação PAY/CHK não há capacidade no contexto (§3.4), e B não tem estimativa.
    expect(created.issues.map((i: { type: string }) => i.type)).toEqual(["NO_CAPACITY", "NO_ESTIMATE", "UNFINISHED_IN_PERIOD"]);

    const reordered = (
      await api
        .patch(`/execution-plans/${created.id}`, {
          items: [{ workItemId: b.id }, { workItemId: a.id, earliestStartDate: TUE, notes: "Depois do alinhamento" }],
          version: 1,
        })
        .expect(200)
    ).body;
    expect(reordered.items.map((i: Item) => i.workItem.externalKey)).toEqual([b.externalKey, a.externalKey]);
    expect(reordered.items[1]).toMatchObject({ position: 2, earliestStartDate: TUE, notes: "Depois do alinhamento" });
    expect(reordered.history[0]).toMatchObject({ action: "execution_plan.queue_updated", fields: ["items"] });
    await api.patch(`/execution-plans/${created.id}`, { items: [], version: 1 }).expect(409);

    // Trocar para híbrido sem informar o limite usa o padrão do modo.
    const hybrid = (await api.patch(`/execution-plans/${created.id}`, { executionMode: "HYBRID", version: 2 }).expect(200)).body;
    expect(hybrid.maxParallelItems).toBe(2);
    await api.patch(`/execution-plans/${created.id}`, { maxParallelItems: 2, executionMode: "SEQUENTIAL", version: 3 }).expect(422);
  });
});

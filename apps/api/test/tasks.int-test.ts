import type { INestApplication } from "@nestjs/common";
import { addDays, todayIn } from "@tlh/shared-contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { resetDatabase, type SignedIn, signedIn, startApp } from "./helpers";

describe("Minhas atividades, fila de foco e dashboard (integração)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let api: SignedIn;
  // O setup usa o fuso padrão do workspace.
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
  });

  const createTask = async (body: object) => (await api.post("/tasks", body).expect(201)).body;

  it("cria, prioriza e lista na ordenação padrão (CA-001, §6.7)", async () => {
    const low = await createTask({ title: "Ler RFC", priority: "LOW" });
    const critical = await createTask({ title: "Decidir fila", priority: "CRITICAL", type: "DECISION" });
    const overdue = await createTask({ title: "Revisar contrato", dueDate: addDays(today(), -2), estimatedHours: 1.5 });

    expect(overdue).toMatchObject({ dueState: "OVERDUE", estimatedHours: 1.5, type: "OTHER", priority: "MEDIUM" });
    const list = await api.get("/tasks").expect(200);
    expect(list.body.map((t: { id: string }) => t.id)).toEqual([overdue.id, critical.id, low.id]);
  });

  it("concluir tira de atrasada e da fila de foco (CA-003, RN-001, §6.6)", async () => {
    const task = await createTask({ title: "Revisar contrato", dueDate: addDays(today(), -1) });
    await api.put("/focus-queue", { taskIds: [task.id], primaryTaskId: task.id }).expect(200);

    const done = await api.post(`/tasks/${task.id}/complete`, { actualHours: 2, version: 1 }).expect(200);
    expect(done.body).toMatchObject({ status: "DONE", dueState: null, focus: null, actualHours: 2 });
    expect(done.body.completedAt).not.toBeNull();

    const queue = await api.get("/focus-queue").expect(200);
    expect(queue.body.items).toEqual([]);
    expect((await api.get("/tasks").expect(200)).body).toEqual([]);
    expect((await api.get("/tasks?scope=closed").expect(200)).body).toHaveLength(1);

    // Reabrir limpa a data de conclusão.
    const reopened = await api.patch(`/tasks/${task.id}`, { status: "TODO", version: 2 }).expect(200);
    expect(reopened.body).toMatchObject({ completedAt: null, dueState: "OVERDUE" });
  });

  it("fila de foco: até três, um principal, só atividades abertas (CA-002, RN-002, RN-003)", async () => {
    const [a, b, c, d] = await Promise.all(["A", "B", "C", "D"].map((title) => createTask({ title: `Atividade ${title}` })));
    await api.put("/focus-queue", { taskIds: [a.id, b.id, c.id, d.id], primaryTaskId: null }).expect(400);

    const queue = await api.put("/focus-queue", { taskIds: [b.id, a.id, c.id], primaryTaskId: a.id }).expect(200);
    expect(queue.body.items.map((i: { task: { id: string }; isPrimary: boolean }) => [i.task.id, i.isPrimary])).toEqual([
      [b.id, false],
      [a.id, true],
      [c.id, false],
    ]);

    await api.patch(`/tasks/${d.id}`, { status: "CANCELLED", version: 1 }).expect(200);
    const closed = await api.put("/focus-queue", { taskIds: [d.id], primaryTaskId: null }).expect(422);
    expect(closed.body.code).toBe("RULE_VIOLATION");

    // Lista: foco principal primeiro, depois a ordem manual da fila.
    const list = await api.get("/tasks").expect(200);
    expect(list.body.map((t: { id: string }) => t.id)).toEqual([a.id, b.id, c.id]);
  });

  it("vincula a vários times e projetos sem duplicar a atividade (§6.8, RN-023)", async () => {
    const { body: pay } = await api.post("/teams", { name: "Pagamentos", code: "PAY" }).expect(201);
    const { body: core } = await api.post("/teams", { name: "Core", code: "CORE" }).expect(201);
    const { body: chk } = await api.post("/projects", { name: "Checkout", code: "CHK" }).expect(201);

    const task = await createTask({ title: "Revisar integração", teamIds: [pay.id, core.id], projectIds: [chk.id] });
    await createTask({ title: "Sem contexto" });
    expect(task.teams.map((t: { code: string }) => t.code)).toEqual(["CORE", "PAY"]);

    expect((await api.get(`/tasks?teamId=${pay.id}`).expect(200)).body).toHaveLength(1);
    expect((await api.get(`/tasks?teamId=${pay.id}&projectId=${chk.id}`).expect(200)).body).toHaveLength(1);
    expect((await api.get("/tasks").expect(200)).body).toHaveLength(2);

    const updated = await api.patch(`/tasks/${task.id}`, { teamIds: [core.id], version: 1 }).expect(200);
    expect(updated.body.teams.map((t: { code: string }) => t.code)).toEqual(["CORE"]);

    // Novos vínculos com projeto arquivado são recusados (§8.5); o existente permanece.
    await api.patch(`/projects/${chk.id}`, { status: "ARCHIVED", version: 1 }).expect(200);
    await api.patch(`/tasks/${task.id}`, { title: "Revisar integração v2", version: 2 }).expect(200);
    const fresh = await api.post("/tasks", { title: "Nova", projectIds: [chk.id] }).expect(422);
    expect(fresh.body.code).toBe("RULE_VIOLATION");
  });

  it("controla versão e audita a transição de situação", async () => {
    const task = await createTask({ title: "Investigar lentidão", type: "INVESTIGATION" });
    await api.patch(`/tasks/${task.id}`, { status: "BLOCKED", blockedReason: "Sem acesso aos logs", version: 1 }).expect(200);
    await api.patch(`/tasks/${task.id}`, { title: "Outro", version: 1 }).expect(409);

    const unblocked = await api.patch(`/tasks/${task.id}`, { status: "IN_PROGRESS", version: 2 }).expect(200);
    expect(unblocked.body.blockedReason).toBeNull();

    const events = await prisma.auditEvent.findMany({ where: { entityId: task.id }, orderBy: { occurredAt: "asc" } });
    expect(events.map((e) => e.action)).toEqual(["task.created", "task.updated", "task.updated"]);
    expect(events[2]?.metadata).toMatchObject({ fromStatus: "BLOCKED", toStatus: "IN_PROGRESS" });
  });

  it("dashboard agrupa prazos e respeita o contexto sem alterar o foco (§5.2, §5.4, CA-010)", async () => {
    const { body: pay } = await api.post("/teams", { name: "Pagamentos", code: "PAY" }).expect(201);
    const overdue = await createTask({ title: "Atrasada", dueDate: addDays(today(), -1), teamIds: [pay.id] });
    const dueToday = await createTask({ title: "Hoje", dueDate: today() });
    const soon = await createTask({ title: "Em breve", dueDate: addDays(today(), 3) });
    await createTask({ title: "Bloqueada", teamIds: [pay.id] }).then((t) =>
      api.patch(`/tasks/${t.id}`, { status: "BLOCKED", version: 1 }).expect(200),
    );
    await api.put("/focus-queue", { taskIds: [soon.id], primaryTaskId: soon.id }).expect(200);

    const global = await api.get("/dashboard").expect(200);
    expect(global.body.personal).toMatchObject({ openCount: 4, inProgressCount: 0 });
    expect(global.body.personal.overdue.map((t: { id: string }) => t.id)).toEqual([overdue.id]);
    expect(global.body.personal.dueToday.map((t: { id: string }) => t.id)).toEqual([dueToday.id]);
    expect(global.body.personal.upcoming.map((t: { id: string }) => t.id)).toEqual([soon.id]);
    expect(global.body.personal.blocked).toHaveLength(1);
    expect(global.body.organization).toEqual({ activeTeams: 1, activeProjects: 0, activeDevelopers: 0 });

    const contextual = await api.get(`/dashboard?teamId=${pay.id}`).expect(200);
    expect(contextual.body.context.team).toMatchObject({ code: "PAY" });
    expect(contextual.body.personal.openCount).toBe(2);
    expect(contextual.body.focus.items[0].task.id).toBe(soon.id);

    await api.get(`/dashboard?teamId=${crypto.randomUUID()}`).expect(404);
  });
});

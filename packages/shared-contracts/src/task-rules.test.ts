import { describe, expect, it } from "vitest";
import { addDays, compareTasksDefault, dueStateOf, todayIn } from "./task-rules";
import { createTaskSchema, updateFocusQueueSchema } from "./tasks";
import { createTeamSchema } from "./organization";

describe("todayIn", () => {
  it("usa o fuso do workspace, não o do servidor", () => {
    const instant = new Date("2026-10-17T01:30:00Z");
    expect(todayIn("America/Sao_Paulo", instant)).toBe("2026-10-16");
    expect(todayIn("UTC", instant)).toBe("2026-10-17");
  });

  it("soma dias atravessando o mês", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
  });
});

describe("dueStateOf", () => {
  const today = "2026-10-16";

  it("classifica atrasada, hoje e próxima", () => {
    expect(dueStateOf({ status: "TODO", dueDate: "2026-10-15" }, today)).toBe("OVERDUE");
    expect(dueStateOf({ status: "BLOCKED", dueDate: today }, today)).toBe("DUE_TODAY");
    expect(dueStateOf({ status: "IN_PROGRESS", dueDate: "2026-10-23" }, today)).toBe("DUE_SOON");
    expect(dueStateOf({ status: "TODO", dueDate: "2026-10-24" }, today)).toBeNull();
  });

  it("nunca considera atrasada uma atividade concluída ou cancelada (RN-001, CA-003)", () => {
    expect(dueStateOf({ status: "DONE", dueDate: "2026-01-01" }, today)).toBeNull();
    expect(dueStateOf({ status: "CANCELLED", dueDate: "2026-01-01" }, today)).toBeNull();
  });

  it("sem prazo não gera alerta (§3.4)", () => {
    expect(dueStateOf({ status: "TODO", dueDate: null }, today)).toBeNull();
  });
});

describe("compareTasksDefault (§6.7)", () => {
  const base = { priority: "MEDIUM", dueDate: null, dueState: null, focus: null, createdAt: "2026-10-01T00:00:00Z" } as const;
  const tasks = {
    other: { ...base },
    soon: { ...base, dueDate: "2026-10-20", dueState: "DUE_SOON" },
    critical: { ...base, priority: "CRITICAL" },
    overdue: { ...base, dueDate: "2026-10-01", dueState: "OVERDUE" },
    focus2: { ...base, focus: { position: 2, isPrimary: false } },
    focus1: { ...base, focus: { position: 1, isPrimary: false } },
    primary: { ...base, focus: { position: 0, isPrimary: true } },
  } as const;

  it("ordena foco principal, foco, atrasadas, críticas, próximas e demais", () => {
    const sorted = Object.entries(tasks)
      .sort(([, a], [, b]) => compareTasksDefault(a, b))
      .map(([key]) => key);
    expect(sorted).toEqual(["primary", "focus1", "focus2", "overdue", "critical", "soon", "other"]);
  });
});

describe("schemas", () => {
  it("normaliza o código do time para maiúsculas", () => {
    expect(createTeamSchema.parse({ name: "Pagamentos", code: " pay " }).code).toBe("PAY");
    expect(createTeamSchema.safeParse({ name: "Pagamentos", code: "a" }).success).toBe(false);
  });

  it("aplica padrões e transforma campos vazios em null", () => {
    const parsed = createTaskSchema.parse({ title: "Revisar contrato", dueDate: "", nextAction: "" });
    expect(parsed).toMatchObject({ type: "OTHER", priority: "MEDIUM", dueDate: null, nextAction: null, teamIds: [] });
  });

  it("limita a fila de foco a três e exige o principal dentro dela (RN-002, RN-003)", () => {
    const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    expect(updateFocusQueueSchema.safeParse({ taskIds: ids, primaryTaskId: null }).success).toBe(false);
    expect(updateFocusQueueSchema.safeParse({ taskIds: ids.slice(0, 2), primaryTaskId: ids[3] }).success).toBe(false);
    expect(updateFocusQueueSchema.safeParse({ taskIds: ids.slice(0, 3), primaryTaskId: ids[1] }).success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { addToQueue, canAdd, move, removeFromQueue, setPrimary } from "./focus-queue-ops";

const empty = { taskIds: [], primaryTaskId: null };

describe("operações da fila de foco (§6.6)", () => {
  it("a primeira atividade adicionada vira o foco principal", () => {
    expect(addToQueue(empty, "a")).toEqual({ taskIds: ["a"], primaryTaskId: "a" });
    expect(addToQueue({ taskIds: ["a"], primaryTaskId: "a" }, "b")).toEqual({ taskIds: ["a", "b"], primaryTaskId: "a" });
  });

  it("não passa de três atividades nem duplica (RN-003)", () => {
    const full = { taskIds: ["a", "b", "c"], primaryTaskId: "a" };
    expect(canAdd(full, "d")).toBe(false);
    expect(addToQueue(full, "d")).toBe(full);
    expect(canAdd({ taskIds: ["a"], primaryTaskId: null }, "a")).toBe(false);
  });

  it("remover o principal deixa a fila sem principal", () => {
    expect(removeFromQueue({ taskIds: ["a", "b"], primaryTaskId: "a" }, "a")).toEqual({ taskIds: ["b"], primaryTaskId: null });
  });

  it("reordena e troca o principal (RN-002)", () => {
    const queue = { taskIds: ["a", "b", "c"], primaryTaskId: "a" };
    expect(move(queue, "c", -1).taskIds).toEqual(["a", "c", "b"]);
    expect(move(queue, "a", -1)).toBe(queue);
    expect(setPrimary(queue, "b").primaryTaskId).toBe("b");
    expect(setPrimary(queue, "z")).toBe(queue);
  });
});

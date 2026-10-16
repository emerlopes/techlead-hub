import { describe, expect, it } from "vitest";
import { dispatch } from "./registry";

describe("dispatch", () => {
  it("executa o handler registrado", async () => {
    await expect(dispatch("system.ping", {})).resolves.toMatchObject({ pong: true });
  });

  it("falha explicitamente para job desconhecido", async () => {
    await expect(dispatch("nao.existe", {})).rejects.toThrow("Job desconhecido");
  });
});

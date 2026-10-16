import { describe, expect, it } from "vitest";
import { loginSchema, setupSchema } from "./auth";
import { updateWorkspaceSchema } from "./workspace";

describe("setupSchema", () => {
  const valid = {
    name: "Ana Souza",
    email: "  Ana@Example.COM ",
    password: "uma-senha-bem-longa",
    workspaceName: "Meu workspace",
  };

  it("normaliza e-mail e aplica o fuso padrão", () => {
    const parsed = setupSchema.parse(valid);
    expect(parsed.email).toBe("ana@example.com");
    expect(parsed.timezone).toBe("America/Sao_Paulo");
  });

  it("rejeita senha curta", () => {
    const result = setupSchema.safeParse({ ...valid, password: "curta" });
    expect(result.success).toBe(false);
  });

  it("rejeita fuso inexistente", () => {
    const result = setupSchema.safeParse({ ...valid, timezone: "Marte/Olympus" });
    expect(result.success).toBe(false);
  });

  it("rejeita campos desconhecidos", () => {
    const result = setupSchema.safeParse({ ...valid, role: "admin" });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("exige senha preenchida sem expor a política", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
});

describe("updateWorkspaceSchema", () => {
  it("exige a versão para controle de concorrência", () => {
    expect(updateWorkspaceSchema.safeParse({ name: "Novo" }).success).toBe(false);
    expect(updateWorkspaceSchema.safeParse({ name: "Novo", version: 1 }).success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { PasswordService } from "./password.service";
import { generateSessionToken, hashSessionToken } from "./session-token";

describe("PasswordService", () => {
  const service = new PasswordService();

  it("gera hash Argon2id e valida a senha", async () => {
    const hash = await service.hash("uma-senha-bem-longa");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await service.verify(hash, "uma-senha-bem-longa")).toBe(true);
    expect(await service.verify(hash, "outra-senha")).toBe(false);
  });

  it("trata hash corrompido como senha inválida", async () => {
    expect(await service.verify("não-é-um-hash", "x")).toBe(false);
  });
});

describe("session token", () => {
  it("gera tokens únicos e persiste só o SHA-256", () => {
    const a = generateSessionToken();
    expect(a).not.toBe(generateSessionToken());
    expect(hashSessionToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(a)).not.toContain(a);
  });
});

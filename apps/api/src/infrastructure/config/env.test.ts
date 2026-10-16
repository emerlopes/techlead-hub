import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("aplica padrões seguros para execução local", () => {
    const env = parseEnv({ DATABASE_URL: "postgresql://x" });
    expect(env.HOST).toBe("127.0.0.1");
    expect(env.PORT).toBe(4000);
    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.WEB_ORIGINS).toEqual(["http://localhost:3000", "http://127.0.0.1:3000"]);
  });

  it("interpreta listas e booleanos vindos do ambiente", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://x",
      WEB_ORIGINS: "https://hub.example.com, https://outra.example.com",
      COOKIE_SECURE: "true",
    });
    expect(env.WEB_ORIGINS).toEqual(["https://hub.example.com", "https://outra.example.com"]);
    expect(env.COOKIE_SECURE).toBe(true);
  });

  it("falha listando o problema sem ecoar valores", () => {
    expect(() => parseEnv({ PORT: "abc" })).toThrowError(/DATABASE_URL[\s\S]*PORT|PORT[\s\S]*DATABASE_URL/);
  });
});

import { describe, expect, it } from "vitest";
import { isCsrfSafe } from "./csrf.guard";

const origins = ["http://localhost:3000"];

describe("isCsrfSafe", () => {
  it("libera métodos seguros", () => {
    expect(isCsrfSafe("GET", {}, origins)).toBe(true);
  });

  it("exige o cabeçalho customizado em métodos que alteram estado", () => {
    expect(isCsrfSafe("POST", {}, origins)).toBe(false);
    expect(isCsrfSafe("POST", { "x-tlh-csrf": "1" }, origins)).toBe(true);
  });

  it("rejeita origem fora da lista mesmo com o cabeçalho", () => {
    expect(isCsrfSafe("PATCH", { "x-tlh-csrf": "1", origin: "https://evil.example" }, origins)).toBe(false);
    expect(isCsrfSafe("PATCH", { "x-tlh-csrf": "1", origin: "http://localhost:3000" }, origins)).toBe(true);
  });
});

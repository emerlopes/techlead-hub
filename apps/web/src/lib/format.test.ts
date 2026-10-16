import { describe, expect, it } from "vitest";
import { formatDateTime } from "./format";
import { listTimeZones } from "./time-zones";

describe("formatDateTime", () => {
  it("formata em pt-BR no fuso do workspace", () => {
    const iso = "2026-03-01T15:30:00.000Z";
    expect(formatDateTime(iso, "America/Sao_Paulo")).toContain("12:30");
    expect(formatDateTime(iso, "UTC")).toContain("15:30");
  });
});

describe("listTimeZones", () => {
  it("inclui o fuso atual e o padrão, ordenados", () => {
    const zones = listTimeZones("Etc/GMT+3");
    expect(zones).toContain("Etc/GMT+3");
    expect(zones).toContain("America/Sao_Paulo");
    expect([...zones].sort((a, b) => a.localeCompare(b))).toEqual(zones);
  });
});

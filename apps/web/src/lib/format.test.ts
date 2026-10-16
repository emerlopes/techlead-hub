import { describe, expect, it } from "vitest";
import { formatBusinessDate, formatDateTime, formatHours } from "./format";
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

describe("formatBusinessDate", () => {
  it("não desloca a data de negócio pelo fuso", () => {
    expect(formatBusinessDate("2026-10-01")).toBe("01 de out");
  });
});

describe("formatHours", () => {
  it("usa vírgula decimal e travessão sem dado", () => {
    expect(formatHours(1.5)).toBe("1,5 h");
    expect(formatHours(null)).toBe("—");
  });
});

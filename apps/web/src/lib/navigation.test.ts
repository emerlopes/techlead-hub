import { describe, expect, it } from "vitest";
import { isActiveSection, safeNextPath } from "./navigation";

describe("safeNextPath", () => {
  it("mantém caminhos internos", () => {
    expect(safeNextPath("/settings?tab=1")).toBe("/settings?tab=1");
    expect(safeNextPath(["/a", "/b"])).toBe("/a");
  });

  it("descarta destinos externos ou ausentes", () => {
    for (const value of [undefined, "", "https://evil.example", "//evil.example", "/\\evil.example"]) {
      expect(safeNextPath(value)).toBe("/");
    }
  });
});

describe("isActiveSection", () => {
  it("ativa a seção e suas subpáginas, sem prefixos parciais", () => {
    expect(isActiveSection("/sprints/123", "/sprints")).toBe(true);
    expect(isActiveSection("/sprints", "/sprints")).toBe(true);
    expect(isActiveSection("/sprints-old", "/sprints")).toBe(false);
    expect(isActiveSection("/tasks", "/")).toBe(false);
    expect(isActiveSection("/", "/")).toBe(true);
  });
});

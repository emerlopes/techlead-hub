import { describe, expect, it } from "vitest";
import { safeNextPath } from "./navigation";

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

import { describe, expect, it } from "vitest";
import {
  calculateDeliveryHealth,
  classifyHealth,
  daysSince,
  effectiveHealth,
  isNotReadyForImminentSprint,
  isTrackingStale,
  suggestsReady,
} from "./delivery-rules";
import { createJournalEntrySchema } from "./journal";
import { createRiskSchema } from "./risks";
import { createSprintSchema } from "./sprints";
import { createWorkItemSchema, workItemListQuerySchema } from "./work-items";

const today = "2026-10-16";
const open = { executionStatus: "IN_PROGRESS" as const, openRisks: [] };

describe("saúde calculada (§14.4, RN-012)", () => {
  it("dados insuficientes produzem estado indeterminado", () => {
    expect(calculateDeliveryHealth({ ...open, committedDate: null, forecastDate: null }, today)).toBe("UNKNOWN");
    expect(calculateDeliveryHealth({ ...open, committedDate: "2026-10-20", forecastDate: null }, today)).toBe("UNKNOWN");
  });

  it("classifica no prazo, em risco e atrasada pelas datas", () => {
    expect(calculateDeliveryHealth({ ...open, committedDate: "2026-10-20", forecastDate: "2026-10-19" }, today)).toBe("ON_TRACK");
    expect(calculateDeliveryHealth({ ...open, committedDate: "2026-10-20", forecastDate: "2026-10-22" }, today)).toBe("AT_RISK");
    expect(calculateDeliveryHealth({ ...open, committedDate: "2026-10-15", forecastDate: "2026-10-22" }, today)).toBe("DELAYED");
  });

  it("impedimento total bloqueia; parcial e risco alto colocam em risco (§16.4)", () => {
    const base = { ...open, committedDate: "2026-10-20", forecastDate: "2026-10-19" };
    expect(
      calculateDeliveryHealth({ ...base, openRisks: [{ type: "IMPEDIMENT", severity: "LOW", blockingLevel: "FULL" }] }, today),
    ).toBe("BLOCKED");
    expect(
      calculateDeliveryHealth({ ...base, openRisks: [{ type: "IMPEDIMENT", severity: "LOW", blockingLevel: "PARTIAL" }] }, today),
    ).toBe("AT_RISK");
    expect(calculateDeliveryHealth({ ...base, openRisks: [{ type: "RISK", severity: "HIGH", blockingLevel: null }] }, today)).toBe(
      "AT_RISK",
    );
    expect(calculateDeliveryHealth({ ...base, openRisks: [{ type: "RISK", severity: "LOW", blockingLevel: null }] }, today)).toBe(
      "ON_TRACK",
    );
  });

  it("execução encerrada não tem saúde; a avaliação manual prevalece só na exibição", () => {
    expect(
      calculateDeliveryHealth({ executionStatus: "DONE", openRisks: [], committedDate: "2026-01-01", forecastDate: null }, today),
    ).toBeNull();
    expect(effectiveHealth(false, "AT_RISK", "ON_TRACK")).toBe("AT_RISK");
    expect(effectiveHealth(false, null, "ON_TRACK")).toBe("ON_TRACK");
    expect(effectiveHealth(true, "AT_RISK", null)).toBeNull();
    expect(classifyHealth({ closed: false, committedDate: null, forecastDate: null, blocked: true, atRisk: false }, today)).toBe(
      "BLOCKED",
    );
  });
});

describe("acompanhamento desatualizado (§14.5)", () => {
  const now = new Date("2026-10-16T12:00:00Z");
  it("nunca verificado ou verificado há mais de 3 dias é desatualizado", () => {
    expect(isTrackingStale(false, null, now)).toBe(true);
    expect(isTrackingStale(false, "2026-10-12T11:00:00Z", now)).toBe(true);
    expect(isTrackingStale(false, "2026-10-14T12:00:00Z", now)).toBe(false);
    expect(isTrackingStale(true, null, now)).toBe(false);
    expect(daysSince("2026-10-14T12:00:00Z", now)).toBe(2);
    expect(daysSince(null, now)).toBeNull();
  });
});

describe("refinamento (§15.5)", () => {
  const sprint = (status: "PLANNED" | "ACTIVE" | "CLOSED", startDate: string) => ({ status, startDate });
  it("alerta item não pronto em sprint ativa ou que começa em até 5 dias", () => {
    const item = { executionStatus: "NOT_STARTED" as const, refinementStatus: "ANALYZING" as const };
    expect(isNotReadyForImminentSprint({ ...item, sprints: [sprint("ACTIVE", "2026-10-01")] }, today)).toBe(true);
    expect(isNotReadyForImminentSprint({ ...item, sprints: [sprint("PLANNED", "2026-10-21")] }, today)).toBe(true);
    expect(isNotReadyForImminentSprint({ ...item, sprints: [sprint("PLANNED", "2026-10-30")] }, today)).toBe(false);
    expect(isNotReadyForImminentSprint({ ...item, sprints: [sprint("CLOSED", "2026-10-01")] }, today)).toBe(false);
    expect(
      isNotReadyForImminentSprint({ ...item, refinementStatus: "READY", sprints: [sprint("ACTIVE", "2026-10-01")] }, today),
    ).toBe(false);
  });

  it("checklist completo sugere pronto, sem aplicar", () => {
    expect(suggestsReady("ANALYZING", { total: 3, checked: 3 })).toBe(true);
    expect(suggestsReady("ANALYZING", { total: 3, checked: 2 })).toBe(false);
    expect(suggestsReady("READY", { total: 3, checked: 3 })).toBe(false);
    expect(suggestsReady("ANALYZING", { total: 0, checked: 0 })).toBe(false);
  });
});

describe("schemas de entrega", () => {
  it("item externo: identificador obrigatório, URL http(s) e campos vazios → null", () => {
    const base = { sourceId: crypto.randomUUID(), projectId: crypto.randomUUID(), title: "Checkout com Pix" };
    expect(createWorkItemSchema.safeParse({ ...base, externalKey: " " }).success).toBe(false);
    expect(createWorkItemSchema.safeParse({ ...base, externalKey: "PAY-1", externalUrl: "javascript:alert(1)" }).success).toBe(false);
    const parsed = createWorkItemSchema.parse({ ...base, externalKey: "PAY-1", externalUrl: "", developerId: "", committedDate: "" });
    expect(parsed).toMatchObject({ externalUrl: null, developerId: null, committedDate: null, itemType: "STORY" });
  });

  it("filtros e paginação da listagem", () => {
    expect(workItemListQuerySchema.parse({})).toMatchObject({ scope: "open", page: 1, pageSize: 50 });
    expect(workItemListQuerySchema.parse({ stale: "true", page: "2" })).toMatchObject({ stale: true, page: 2 });
    expect(workItemListQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
  });

  it("sprint exige período válido e risco só tem bloqueio se for impedimento", () => {
    const teamId = crypto.randomUUID();
    expect(createSprintSchema.safeParse({ teamId, name: "S1", startDate: "2026-10-20", endDate: "2026-10-19" }).success).toBe(false);
    expect(createRiskSchema.safeParse({ title: "Fornecedor", blockingLevel: "FULL" }).success).toBe(false);
    expect(createRiskSchema.safeParse({ title: "Fornecedor", type: "IMPEDIMENT", blockingLevel: "FULL" }).success).toBe(true);
  });

  it("diário exige categoria e descrição (§17.4)", () => {
    expect(createJournalEntrySchema.safeParse({ description: "Deploy" }).success).toBe(false);
    expect(createJournalEntrySchema.safeParse({ category: "INCIDENT", description: "  " }).success).toBe(false);
    expect(createJournalEntrySchema.parse({ category: "INCIDENT", description: "Queda no gateway" }).occurredOn).toBeUndefined();
  });
});

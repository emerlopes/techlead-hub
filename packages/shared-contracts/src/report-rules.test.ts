import { describe, expect, it } from "vitest";
import type { JournalCategoryValue, JournalEntry } from "./journal";
import type { ReleaseDetail } from "./releases";
import {
  buildReleaseReport,
  buildSprintDraft,
  buildSprintReport,
  manualReleaseForecast,
  renderDraftMarkdown,
  riskActiveDuring,
} from "./report-rules";
import { generateReportSchema, releaseReportSchema, reportDraftSchema, sprintReportSchema } from "./reports";
import type { Risk } from "./risks";
import type { SprintDetail, SprintItem } from "./sprints";
import type { WorkItem } from "./work-items";

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
const team = { id: uuid(), code: "CORE", name: "Core" };
const project = { id: uuid(), code: "APP", name: "App" };
const at = (day: string) => `${day}T12:00:00.000Z`;

function workItem(key: string, patch: Partial<WorkItem> = {}, health: WorkItem["tracking"]["health"] = "ON_TRACK"): WorkItem {
  return {
    id: uuid(),
    source: { id: uuid(), name: "Jira" },
    externalKey: key,
    title: `Item ${key}`,
    externalUrl: null,
    itemType: "STORY",
    project,
    executionStatus: "IN_PROGRESS",
    refinementStatus: "READY",
    notes: null,
    completedAt: null,
    tracking: {
      executingTeam: team,
      developer: null,
      committedDate: null,
      manualForecastDate: null,
      manualHealth: null,
      calculatedHealth: health,
      health,
      remainingEffortHours: null,
      lastCheckedAt: null,
      stale: false,
      statusSource: null,
      statusNote: null,
      updatedAt: at("2026-10-01"),
    },
    currentSprint: null,
    releases: [],
    openRisks: [],
    estimate: null,
    createdAt: at("2026-10-01"),
    updatedAt: at("2026-10-01"),
    version: 1,
    ...patch,
  };
}

function member(item: WorkItem, patch: Partial<SprintItem> = {}): SprintItem {
  return { membershipId: uuid(), scopeType: "ORIGINAL", enteredAt: at("2026-10-01"), exitedAt: null, exitReason: null, workItem: item, ...patch };
}

function sprint(items: SprintItem[], departed: SprintItem[] = [], status: SprintDetail["status"] = "ACTIVE"): SprintDetail {
  return {
    id: uuid(),
    team,
    name: "Sprint 12",
    goal: "Entregar o checkout",
    startDate: "2026-10-05",
    endDate: "2026-10-16",
    status,
    release: null,
    closedAt: null,
    counts: { total: items.length, done: 0, blocked: 0, openRisks: 0 },
    capacity: {
      allocatedHours: 0,
      demand: { openItems: 0, estimatedItems: 0, unestimatedItems: 0, dueHours: 0, laterHours: 0, undatedHours: 0, totalHours: 0 },
      utilization: null,
      level: "NO_CAPACITY",
    },
    createdAt: at("2026-10-01"),
    updatedAt: at("2026-10-01"),
    version: 1,
    items,
    departed,
    summary: { original: 0, added: 0, movedIn: 0, removed: 0, movedOut: 0, completed: 0, pending: 0 },
    history: [],
  };
}

function entry(category: JournalCategoryValue, description: string, occurredOn = "2026-10-08"): JournalEntry {
  return {
    id: uuid(),
    category,
    description,
    occurredOn,
    links: { teams: [], projects: [], sprints: [], releases: [], workItems: [], risks: [] },
    createdAt: at(occurredOn),
    updatedAt: at(occurredOn),
    version: 1,
  };
}

function risk(title: string, patch: Partial<Risk> = {}): Risk {
  return {
    id: uuid(),
    title,
    description: null,
    type: "RISK",
    severity: "MEDIUM",
    probability: null,
    impact: null,
    blockingLevel: null,
    status: "OPEN",
    mitigationPlan: null,
    owner: null,
    identifiedAt: "2026-10-06",
    resolvedAt: null,
    resolutionNote: null,
    links: { workItems: [], sprints: [], releases: [], projects: [], teams: [], tasks: [] },
    createdAt: at("2026-10-06"),
    updatedAt: at("2026-10-06"),
    version: 1,
    ...patch,
  };
}

const generatedAt = at("2026-10-19");

describe("relatório de sprint (§31.1)", () => {
  const done = workItem("APP-1", { executionStatus: "DONE", completedAt: at("2026-10-09") });
  const blocked = workItem("APP-2", {}, "BLOCKED");
  const added = workItem("APP-3");
  const removed = workItem("APP-4");
  const detail = sprint(
    [member(done), member(blocked), member(added, { scopeType: "ADDED", enteredAt: at("2026-10-07") })],
    [member(removed, { exitedAt: at("2026-10-08"), exitReason: "REMOVED" })],
  );

  it("separa escopo original, mudanças, concluídos, pendentes e bloqueados", () => {
    const report = buildSprintReport({ detail, risks: [], journal: [], generatedAt });
    expect(sprintReportSchema.parse(report)).toBeTruthy();
    expect(report.originalScope.map((e) => e.workItem.externalKey)).toEqual(["APP-1", "APP-2", "APP-4"]);
    expect(report.scopeChanges.map((c) => [c.kind, c.workItem.externalKey])).toEqual([
      ["ADDED", "APP-3"],
      ["REMOVED", "APP-4"],
    ]);
    expect(report.completed.map((e) => e.workItem.externalKey)).toEqual(["APP-1"]);
    expect(report.pending.map((e) => e.workItem.externalKey)).toEqual(["APP-2", "APP-3"]);
    expect(report.blockedItems.map((e) => e.workItem.externalKey)).toEqual(["APP-2"]);
    // O relatório não carrega o detalhe inteiro da sprint duas vezes.
    expect(report.sprint).not.toHaveProperty("items");
  });

  it("encerrada usa o resultado registrado no fechamento, não a execução atual (RN-011)", () => {
    const reopened = workItem("APP-9", { executionStatus: "IN_PROGRESS" });
    const closed = sprint([member(reopened, { exitedAt: at("2026-10-16"), exitReason: "COMPLETED" })], [], "CLOSED");
    const report = buildSprintReport({ detail: closed, risks: [], journal: [], generatedAt });
    expect(report.completed).toHaveLength(1);
    expect(report.pending).toHaveLength(0);
  });

  it("riscos só entram se estiveram vigentes no período; cancelados ficam de fora", () => {
    expect(riskActiveDuring(risk("antes", { identifiedAt: "2026-09-01", resolvedAt: at("2026-09-20"), status: "RESOLVED" }), "2026-10-05", "2026-10-16")).toBe(false);
    expect(riskActiveDuring(risk("depois", { identifiedAt: "2026-10-20" }), "2026-10-05", "2026-10-16")).toBe(false);
    expect(riskActiveDuring(risk("cancelado", { status: "CANCELLED" }), "2026-10-05", "2026-10-16")).toBe(false);
    expect(riskActiveDuring(risk("resolvido no meio", { status: "RESOLVED", resolvedAt: at("2026-10-10") }), "2026-10-05", "2026-10-16")).toBe(true);

    const report = buildSprintReport({
      detail,
      risks: [risk("Fornecedor atrasado"), risk("Ambiente fora", { type: "IMPEDIMENT", blockingLevel: "FULL" }), risk("Velho", { identifiedAt: "2026-01-01", status: "RESOLVED", resolvedAt: at("2026-02-01") })],
      journal: [],
      generatedAt,
    });
    expect(report.risks.map((r) => r.title)).toEqual(["Fornecedor atrasado"]);
    expect(report.impediments.map((r) => r.title)).toEqual(["Ambiente fora"]);
  });

  it("separa decisões dos demais acontecimentos, em ordem cronológica", () => {
    const report = buildSprintReport({
      detail,
      risks: [],
      journal: [entry("INCIDENT", "Queda", "2026-10-12"), entry("TECH_DECISION", "Usar fila"), entry("LEARNING", "Testar antes", "2026-10-06")],
      generatedAt,
    });
    expect(report.decisions.map((e) => e.description)).toEqual(["Usar fila"]);
    expect(report.events.map((e) => e.description)).toEqual(["Testar antes", "Queda"]);
  });
});

describe("rascunhos de demo e retrospectiva (§31.4, §31.5)", () => {
  const done = workItem("APP-1", { executionStatus: "DONE", completedAt: at("2026-10-09") });
  const pending = workItem("APP-2");

  it("seções sem registro ficam vazias, sem fatos inventados", () => {
    const report = buildSprintReport({ detail: sprint([]), risks: [], journal: [], generatedAt });
    for (const type of ["SPRINT_DEMO", "SPRINT_RETROSPECTIVE"] as const) {
      const draft = buildSprintDraft(type, report, generatedAt);
      expect(reportDraftSchema.parse(draft)).toBeTruthy();
      expect(draft.sections.every((s) => s.entries.length === 0)).toBe(true);
      expect(draft.sections.filter((s) => s.state === "FILLED")).toHaveLength(0);
    }
  });

  it("demo: entregas, destaques, decisões, acontecimentos e pendências com a origem", () => {
    const report = buildSprintReport({
      detail: sprint([member(done), member(pending)]),
      risks: [],
      journal: [entry("ACHIEVEMENT", "Checkout no ar"), entry("TECH_DECISION", "Adotar fila"), entry("INCIDENT", "Queda curta")],
      generatedAt,
    });
    const draft = buildSprintDraft("SPRINT_DEMO", report, generatedAt);
    const byKey = Object.fromEntries(draft.sections.map((s) => [s.key, s]));
    expect(draft.sections.map((s) => s.key)).toEqual(["COMPLETED_DELIVERIES", "RELEVANT_FEATURES", "DECISIONS", "EVENTS", "KNOWN_PENDING"]);
    expect(byKey.COMPLETED_DELIVERIES?.entries).toEqual([{ text: "APP-1 — Item APP-1", date: "2026-10-09", ref: { kind: "WORK_ITEM", id: done.id } }]);
    expect(byKey.RELEVANT_FEATURES?.entries.map((e) => e.text)).toEqual(["Checkout no ar"]);
    expect(byKey.EVENTS?.entries.map((e) => e.text)).toEqual(["Queda curta"]);
    expect(byKey.KNOWN_PENDING?.entries.map((e) => e.ref.id)).toEqual([pending.id]);
  });

  it("retrospectiva: ações sugeridas não são geradas (PEND-9-02)", () => {
    const report = buildSprintReport({
      detail: sprint([member(workItem("APP-5", {}, "BLOCKED"))], [member(workItem("APP-6"), { exitedAt: at("2026-10-08"), exitReason: "MOVED" })]),
      risks: [risk("Ambiente fora", { type: "IMPEDIMENT", blockingLevel: "FULL" })],
      journal: [entry("BLOCK", "Sem acesso ao banco"), entry("LEARNING", "Pedir acesso cedo")],
      generatedAt,
    });
    const draft = buildSprintDraft("SPRINT_RETROSPECTIVE", report, generatedAt);
    const byKey = Object.fromEntries(draft.sections.map((s) => [s.key, s]));
    expect(byKey.BLOCKS?.entries.map((e) => e.text)).toEqual(["Sem acesso ao banco", "Impedimento: Ambiente fora", "APP-5 — Item APP-5"]);
    expect(byKey.SCOPE_CHANGES?.entries.map((e) => e.text)).toEqual(["Remanejado para outra sprint: APP-6 — Item APP-6"]);
    expect(byKey.LEARNINGS?.state).toBe("FILLED");
    expect(byKey.WHAT_WORKED?.state).toBe("NO_DATA");
    expect(byKey.SUGGESTED_ACTIONS).toEqual({ key: "SUGGESTED_ACTIONS", state: "NOT_GENERATED", entries: [] });
  });

  it("Markdown lista os fatos e marca seções vazias", () => {
    const report = buildSprintReport({ detail: sprint([member(done)]), risks: [], journal: [], generatedAt });
    const markdown = renderDraftMarkdown(buildSprintDraft("SPRINT_RETROSPECTIVE", report, generatedAt));
    expect(markdown).toContain("# Rascunho para retrospectiva — Sprint 12 (CORE)");
    expect(markdown).toContain("Objetivo: Entregar o checkout");
    expect(markdown).toContain("## O que funcionou\n\n_Nada registrado no período._");
    expect(markdown).toContain("## Ações sugeridas\n\n_Não gerado automaticamente");
    const demo = renderDraftMarkdown(buildSprintDraft("SPRINT_DEMO", report, generatedAt), (d) => d.split("-").reverse().join("/"));
    expect(demo).toContain("- APP-1 — Item APP-1 (09/10/2026)");
  });

  it("gerar exige tipo e sprint (§36.16)", () => {
    expect(generateReportSchema.safeParse({ type: "SPRINT_DEMO" }).success).toBe(false);
    expect(generateReportSchema.safeParse({ type: "OTHER", sprintId: uuid() }).success).toBe(false);
    expect(generateReportSchema.safeParse({ type: "SPRINT_RETROSPECTIVE", sprintId: uuid() }).success).toBe(true);
  });
});

describe("relatório de release (§31.2)", () => {
  function release(patch: Partial<ReleaseDetail> = {}): ReleaseDetail {
    return {
      id: uuid(),
      project,
      name: "R1",
      description: null,
      startDate: null,
      sprintLengthDays: null,
      committedDate: "2026-11-30",
      forecastDate: null,
      status: "IN_PROGRESS",
      closedAt: null,
      health: "UNKNOWN",
      progress: { required: 0, requiredDone: 0, optional: 0, optionalDone: 0, requiredRemainingHours: 0, requiredUnestimated: 0 },
      teams: [team],
      openRiskCount: 0,
      createdAt: at("2026-10-01"),
      updatedAt: at("2026-10-01"),
      version: 1,
      items: [],
      removed: [],
      milestones: [],
      generatedSprints: [],
      forecastHistory: [],
      history: [],
      ...patch,
    };
  }

  it("sem previsão registrada → null, exibido como \"Sem previsão\" (§3.4)", () => {
    expect(manualReleaseForecast(release())).toBeNull();
  });

  it("previsão manual, sem confiança, registrada desde a primeira linha da sequência atual", () => {
    const forecast = manualReleaseForecast(
      release({
        forecastDate: "2026-12-05",
        forecastHistory: [
          { id: uuid(), changedAt: at("2026-10-15"), committedDate: "2026-11-30", forecastDate: "2026-12-05" },
          { id: uuid(), changedAt: at("2026-10-10"), committedDate: "2026-11-20", forecastDate: "2026-12-05" },
          { id: uuid(), changedAt: at("2026-10-02"), committedDate: "2026-11-20", forecastDate: "2026-11-25" },
        ],
      }),
    );
    expect(forecast).toEqual({ date: "2026-12-05", source: "MANUAL", confidence: null, recordedAt: at("2026-10-10") });
  });

  it("separa obrigatórios e opcionais e ordena mudanças da mais recente para a mais antiga", () => {
    const required = workItem("APP-1");
    const optional = workItem("APP-2");
    const report = buildReleaseReport({
      detail: release({
        items: [
          { membershipId: uuid(), isRequired: true, addedAt: at("2026-10-01"), workItem: required },
          { membershipId: uuid(), isRequired: false, addedAt: at("2026-10-01"), workItem: optional },
        ],
        removed: [
          {
            membershipId: uuid(),
            isRequired: true,
            addedAt: at("2026-10-01"),
            removedAt: at("2026-10-12"),
            workItem: { id: uuid(), externalKey: "APP-3", title: "Saiu" },
          },
        ],
        forecastHistory: [{ id: uuid(), changedAt: at("2026-10-03"), committedDate: "2026-11-30", forecastDate: null }],
      }),
      dependencies: [],
      risks: [],
      journal: [entry("SCOPE_CHANGE", "Cliente pediu corte", "2026-10-11")],
      generatedAt,
    });
    expect(releaseReportSchema.parse(report)).toBeTruthy();
    expect(report.required.map((i) => i.workItem.externalKey)).toEqual(["APP-1"]);
    expect(report.optional.map((i) => i.workItem.externalKey)).toEqual(["APP-2"]);
    expect(report.changes.map((c) => c.kind)).toEqual(["SCOPE_REMOVED", "JOURNAL", "FORECAST"]);
    expect(report.release).not.toHaveProperty("items");
  });
});

import type { JournalCategoryValue, JournalEntry } from "./journal";
import type { WorkDependency } from "./planning";
import { type ReleaseDetail, releaseSchema } from "./releases";
import type {
  DraftEntry,
  DraftSection,
  DraftSectionKey,
  ReleaseChange,
  ReleaseReport,
  ReportDraft,
  ReportDraftType,
  ScopeChange,
  SprintReport,
} from "./reports";
import { draftSectionLabels, draftTypeLabels } from "./reports";
import type { Risk } from "./risks";
import { type SprintDetail, type SprintItem, sprintSchema } from "./sprints";

/* -------------------------------------------------------------------------- */
/* Montagem dos relatórios (§31): funções puras sobre o que já foi registrado. */
/* A API só reúne os dados; aqui ficam as regras, testáveis isoladamente.      */
/* -------------------------------------------------------------------------- */

const byEnteredAt = (a: SprintItem, b: SprintItem) => a.enteredAt.localeCompare(b.enteredAt);
const chronological = (a: JournalEntry, b: JournalEntry) =>
  a.occurredOn.localeCompare(b.occurredOn) || a.createdAt.localeCompare(b.createdAt);

/** Risco vigente em algum dia do período: identificado até o fim e não resolvido antes do início. */
export function riskActiveDuring(risk: Pick<Risk, "status" | "identifiedAt" | "resolvedAt">, from: string, to: string): boolean {
  if (risk.status === "CANCELLED") return false;
  return risk.identifiedAt <= to && (risk.resolvedAt === null || risk.resolvedAt.slice(0, 10) >= from);
}

/** Concluído na sprint: no encerramento vale o resultado registrado (RN-011); antes, a execução atual. */
function isCompletedInSprint(entry: SprintItem, closed: boolean): boolean {
  return closed ? entry.exitReason === "COMPLETED" : entry.workItem.executionStatus === "DONE";
}

function scopeChanges(entries: SprintItem[]): ScopeChange[] {
  const ref = (e: SprintItem) => ({ id: e.workItem.id, externalKey: e.workItem.externalKey, title: e.workItem.title });
  const changes = entries.flatMap((e): ScopeChange[] => {
    const out: ScopeChange[] = [];
    if (e.scopeType === "ADDED") out.push({ kind: "ADDED", at: e.enteredAt, workItem: ref(e) });
    if (e.scopeType === "MOVED") out.push({ kind: "MOVED_IN", at: e.enteredAt, workItem: ref(e) });
    if (e.exitedAt && e.exitReason === "REMOVED") out.push({ kind: "REMOVED", at: e.exitedAt, workItem: ref(e) });
    if (e.exitedAt && e.exitReason === "MOVED") out.push({ kind: "MOVED_OUT", at: e.exitedAt, workItem: ref(e) });
    return out;
  });
  return changes.sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * Relatório de sprint (§31.1). `risks` e `journal` chegam já restritos à sprint e aos itens dela; aqui
 * os riscos são limitados aos vigentes no período e o diário é separado em decisões e acontecimentos.
 */
export function buildSprintReport(input: {
  detail: SprintDetail;
  risks: Risk[];
  journal: JournalEntry[];
  generatedAt: string;
}): SprintReport {
  const { detail, generatedAt } = input;
  const { items, departed, summary } = detail;
  const closed = detail.status === "CLOSED" || detail.status === "CANCELLED";
  const completed = items.filter((e) => isCompletedInSprint(e, closed));
  const pending = items.filter((e) => !isCompletedInSprint(e, closed));
  const relevant = input.risks.filter((r) => riskActiveDuring(r, detail.startDate, detail.endDate));
  const journal = [...input.journal].sort(chronological);

  return {
    generatedAt,
    // O schema descarta escopo e histórico do detalhe: o relatório os reapresenta classificados.
    sprint: sprintSchema.parse(detail),
    summary,
    originalScope: [...items, ...departed].filter((e) => e.scopeType === "ORIGINAL").sort(byEnteredAt),
    scopeChanges: scopeChanges([...items, ...departed]),
    completed,
    pending,
    blockedItems: pending.filter((e) => e.workItem.tracking.health === "BLOCKED"),
    impediments: relevant.filter((r) => r.type === "IMPEDIMENT"),
    risks: relevant.filter((r) => r.type === "RISK"),
    decisions: journal.filter((e) => e.category === "TECH_DECISION"),
    events: journal.filter((e) => e.category !== "TECH_DECISION"),
  };
}

/**
 * Previsão exibida no relatório de release (§31.2). Só existe a manual (§12.5); a calculada, com
 * confiança, entra com a Etapa 6 (PEND-9-01). Sem previsão → `null` ("Sem previsão", §3.4).
 */
export function manualReleaseForecast(detail: Pick<ReleaseDetail, "forecastDate" | "forecastHistory">): ReleaseReport["forecast"] {
  if (!detail.forecastDate) return null;
  // Histórico do mais recente ao mais antigo: o registro vale desde a primeira linha da sequência atual.
  let recordedAt: string | null = null;
  for (const entry of detail.forecastHistory) {
    if (entry.forecastDate !== detail.forecastDate) break;
    recordedAt = entry.changedAt;
  }
  return { date: detail.forecastDate, source: "MANUAL", confidence: null, recordedAt };
}

/** Relatório de release (§31.2). Riscos chegam abertos; dependências, as dos itens do escopo. */
export function buildReleaseReport(input: {
  detail: ReleaseDetail;
  dependencies: WorkDependency[];
  risks: Risk[];
  journal: JournalEntry[];
  generatedAt: string;
}): ReleaseReport {
  const { detail } = input;
  const { items, removed, forecastHistory } = detail;
  const changes: ReleaseChange[] = [
    ...forecastHistory.map((h): ReleaseChange => ({
      kind: "FORECAST",
      at: h.changedAt,
      committedDate: h.committedDate,
      forecastDate: h.forecastDate,
    })),
    ...removed.map((m): ReleaseChange => ({ kind: "SCOPE_REMOVED", at: m.removedAt, workItem: m.workItem, isRequired: m.isRequired })),
    // Acontecimentos são datas de negócio: o início do dia serve só para ordenar junto dos demais.
    ...input.journal.map((entry): ReleaseChange => ({ kind: "JOURNAL", at: `${entry.occurredOn}T00:00:00.000Z`, entry })),
  ];

  return {
    generatedAt: input.generatedAt,
    release: releaseSchema.parse(detail),
    forecast: manualReleaseForecast(detail),
    required: items.filter((i) => i.isRequired),
    optional: items.filter((i) => !i.isRequired),
    dependencies: input.dependencies,
    risks: input.risks,
    changes: changes.sort((a, b) => b.at.localeCompare(a.at)),
  };
}

/* -------------------------------------------------------------------------- */
/* Rascunhos de demo e retrospectiva (§31.4, §31.5)                           */
/* -------------------------------------------------------------------------- */

const scopeChangeText: Record<ScopeChange["kind"], string> = {
  ADDED: "Adicionado após o início",
  MOVED_IN: "Remanejado de outra sprint",
  REMOVED: "Retirado da sprint",
  MOVED_OUT: "Remanejado para outra sprint",
};

const itemEntry = (e: SprintItem): DraftEntry => ({
  text: `${e.workItem.externalKey} — ${e.workItem.title}`,
  date: e.workItem.completedAt?.slice(0, 10) ?? null,
  ref: { kind: "WORK_ITEM", id: e.workItem.id },
});
const journalEntry = (e: JournalEntry): DraftEntry => ({
  text: e.description,
  date: e.occurredOn,
  ref: { kind: "JOURNAL_ENTRY", id: e.id },
});
const riskEntry = (r: Risk): DraftEntry => ({
  text: r.type === "IMPEDIMENT" ? `Impedimento: ${r.title}` : r.title,
  date: r.identifiedAt,
  ref: { kind: "RISK", id: r.id },
});
const changeEntry = (c: ScopeChange): DraftEntry => ({
  text: `${scopeChangeText[c.kind]}: ${c.workItem.externalKey} — ${c.workItem.title}`,
  date: c.at.slice(0, 10),
  ref: { kind: "WORK_ITEM", id: c.workItem.id },
});

/** Seção com o que foi registrado; vazia fica `NO_DATA`, nunca preenchida por inferência (§31.5). */
const section = (key: DraftSectionKey, entries: DraftEntry[]): DraftSection => ({
  key,
  state: entries.length > 0 ? "FILLED" : "NO_DATA",
  entries,
});

/**
 * Rascunho gerado só a partir de fatos da sprint: entregas, diário, riscos e movimentações de escopo.
 * "Ações sugeridas" não é gerada (PEND-9-02): o Tech Lead decide (§3.5).
 */
export function buildSprintDraft(type: ReportDraftType, report: SprintReport, generatedAt: string): ReportDraft {
  const { events, decisions } = report;
  const journal = (...categories: JournalCategoryValue[]) =>
    events.filter((e) => categories.includes(e.category)).map(journalEntry);

  const sections: DraftSection[] =
    type === "SPRINT_DEMO"
      ? [
          section("COMPLETED_DELIVERIES", report.completed.map(itemEntry)),
          section("RELEVANT_FEATURES", journal("ACHIEVEMENT")),
          section("DECISIONS", decisions.map(journalEntry)),
          section("EVENTS", events.filter((e) => e.category !== "ACHIEVEMENT").map(journalEntry)),
          section("KNOWN_PENDING", report.pending.map(itemEntry)),
        ]
      : [
          section("WHAT_WORKED", journal("ACHIEVEMENT")),
          section("PROBLEMS", [...journal("INCIDENT", "RISK"), ...report.risks.map(riskEntry)]),
          section("BLOCKS", [
            ...journal("BLOCK", "UNBLOCK"),
            ...report.impediments.map(riskEntry),
            ...report.blockedItems.map(itemEntry),
          ]),
          section("SCOPE_CHANGES", [...report.scopeChanges.map(changeEntry), ...journal("SCOPE_CHANGE")]),
          section("LEARNINGS", journal("LEARNING")),
          section("DECISIONS", decisions.map(journalEntry)),
          { key: "SUGGESTED_ACTIONS", state: "NOT_GENERATED", entries: [] },
        ];

  const { sprint } = report;
  return {
    type,
    generatedAt,
    sprint: {
      id: sprint.id,
      name: sprint.name,
      team: sprint.team,
      goal: sprint.goal,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
    },
    sections,
  };
}

export const draftEmptyMessages = {
  NO_DATA: "Nada registrado no período.",
  NOT_GENERATED: "Não gerado automaticamente: preencha durante a reunião.",
} as const;

/** Rascunho em Markdown para copiar ou baixar (§34.17). `formatDate` recebe datas `YYYY-MM-DD`. */
export function renderDraftMarkdown(draft: ReportDraft, formatDate: (isoDate: string) => string = (d) => d): string {
  const { sprint } = draft;
  const lines = [
    `# ${draftTypeLabels[draft.type]} — ${sprint.name} (${sprint.team.code})`,
    "",
    `Período: ${formatDate(sprint.startDate)} a ${formatDate(sprint.endDate)}`,
  ];
  if (sprint.goal) lines.push(`Objetivo: ${sprint.goal}`);
  for (const s of draft.sections) {
    lines.push("", `## ${draftSectionLabels[s.key]}`, "");
    if (s.state !== "FILLED") {
      lines.push(`_${draftEmptyMessages[s.state]}_`);
      continue;
    }
    for (const entry of s.entries) {
      const text = entry.text.replace(/\s*\n\s*/g, " ");
      lines.push(`- ${text}${entry.date ? ` (${formatDate(entry.date)})` : ""}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

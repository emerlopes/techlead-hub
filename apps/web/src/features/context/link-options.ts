import type { CheckboxOption } from "@/components/ui/checkbox-group";

/** Opções de vínculo de riscos (§16.2) e acontecimentos do diário (§17.3). */
export type LinkKind = "workItems" | "sprints" | "releases" | "projects" | "teams" | "tasks" | "risks";
export type LinkOptions = Record<LinkKind, CheckboxOption[]>;
export type LinkSelection = Partial<Record<LinkKind, string[]>>;

/** Campo do contrato correspondente a cada tipo de vínculo (`links.workItemIds`…). */
export const linkFields: Record<LinkKind, string> = {
  workItems: "workItemIds",
  sprints: "sprintIds",
  releases: "releaseIds",
  projects: "projectIds",
  teams: "teamIds",
  tasks: "taskIds",
  risks: "riskIds",
};

export const linkGroups: Record<LinkKind, { legend: string; empty: string }> = {
  workItems: { legend: "Entregas", empty: "Nenhum item aberto." },
  sprints: { legend: "Sprints", empty: "Nenhuma sprint aberta." },
  releases: { legend: "Releases", empty: "Nenhuma release aberta." },
  projects: { legend: "Projetos", empty: "Nenhum projeto." },
  teams: { legend: "Times", empty: "Nenhum time." },
  tasks: { legend: "Minhas atividades", empty: "Nenhuma atividade aberta." },
  risks: { legend: "Riscos", empty: "Nenhum risco aberto." },
};

/** Lê as listas marcadas no formulário para o formato `links` do contrato. */
export function readLinks(data: FormData, kinds: readonly LinkKind[]): Record<string, string[]> {
  return Object.fromEntries(kinds.map((kind) => [linkFields[kind], data.getAll(linkFields[kind]).map(String)]));
}

/** IDs já vinculados a partir do formato de leitura (`links.workItems: [{ id }]`). */
export function selectionOf(links: Partial<Record<LinkKind, { id: string }[]>>): LinkSelection {
  return Object.fromEntries(Object.entries(links).map(([kind, refs]) => [kind, (refs ?? []).map((r) => r.id)]));
}

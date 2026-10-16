import Link from "next/link";
import { ContextChip } from "./domain-tag";

type Links = {
  teams?: { id: string; code: string; name: string }[];
  projects?: { id: string; code: string; name: string }[];
  sprints?: { id: string; name: string }[];
  releases?: { id: string; name: string }[];
  workItems?: { id: string; externalKey: string; title: string }[];
  risks?: { id: string; title: string }[];
  tasks?: { id: string; title: string }[];
};

const chip =
  "pressable inline-flex h-5 max-w-56 items-center truncate rounded border border-border bg-surface px-1.5 text-2xs font-medium text-muted-foreground hover:text-foreground";

/** Contextos relacionados a um risco ou acontecimento (§16.2, §17.3), com link para cada um. */
export function LinkChips({ links, empty }: { links: Links; empty?: string }) {
  const chips = [
    ...(links.teams ?? []).map((t) => ({ key: `t-${t.id}`, label: `Time ${t.name}`, href: `/teams/${t.id}`, node: <ContextChip code={t.code} name={t.name} /> })),
    ...(links.projects ?? []).map((p) => ({ key: `p-${p.id}`, label: `Projeto ${p.name}`, href: `/projects/${p.id}`, node: <ContextChip code={p.code} name={p.name} /> })),
    ...(links.workItems ?? []).map((w) => ({
      key: `w-${w.id}`,
      label: `Item ${w.externalKey}`,
      href: `/work-items/${w.id}`,
      node: (
        <span className={chip} title={w.title}>
          <span className="font-mono">{w.externalKey}</span>
        </span>
      ),
    })),
    ...(links.sprints ?? []).map((s) => ({ key: `s-${s.id}`, label: `Sprint ${s.name}`, href: `/sprints/${s.id}`, node: <span className={chip}>{s.name}</span> })),
    ...(links.releases ?? []).map((r) => ({ key: `r-${r.id}`, label: `Release ${r.name}`, href: `/releases/${r.id}`, node: <span className={chip}>{r.name}</span> })),
    ...(links.risks ?? []).map((r) => ({ key: `k-${r.id}`, label: `Risco ${r.title}`, href: `/risks/${r.id}`, node: <span className={chip}>{r.title}</span> })),
    ...(links.tasks ?? []).map((t) => ({ key: `a-${t.id}`, label: `Atividade ${t.title}`, href: `/tasks/${t.id}`, node: <span className={chip}>{t.title}</span> })),
  ];
  if (chips.length === 0) return empty ? <span className="text-xs text-muted-foreground">{empty}</span> : null;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {chips.map((c) => (
        <Link key={c.key} href={c.href} aria-label={c.label} className="pressable rounded">
          {c.node}
        </Link>
      ))}
    </span>
  );
}

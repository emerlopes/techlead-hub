"use client";

import type { ContextRef } from "@tlh/shared-contracts";
import { Filter, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import type { SelectedContext } from "./context-cookie";
import { setContext } from "./actions";

/**
 * Filtros globais de contexto (§5.3): todos os times/projetos ou um específico. A escolha fica em
 * cookie e vale para o dashboard e para Minhas Atividades até ser alterada.
 */
export function ContextFilter({
  teams,
  projects,
  selected,
}: {
  teams: ContextRef[];
  projects: ContextRef[];
  selected: SelectedContext;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function apply(teamId: string, projectId: string) {
    startTransition(async () => {
      await setContext(teamId, projectId);
      router.refresh();
    });
  }

  const teamId = selected.teamId ?? "";
  const projectId = selected.projectId ?? "";
  const active = Boolean(teamId || projectId);

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
      aria-busy={pending}
    >
      <span className="flex items-center gap-1.5 text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Filter className="size-3.5" aria-hidden />
        Contexto
      </span>
      <Select
        aria-label="Time"
        className="h-7 w-auto min-w-36 flex-1 text-xs sm:flex-none"
        value={teamId}
        disabled={pending}
        onChange={(e) => apply(e.target.value, projectId)}
      >
        <option value="">Todos os times</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.code} · {t.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Projeto"
        className="h-7 w-auto min-w-36 flex-1 text-xs sm:flex-none"
        value={projectId}
        disabled={pending}
        onChange={(e) => apply(teamId, e.target.value)}
      >
        <option value="">Todos os projetos</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code} · {p.name}
          </option>
        ))}
      </Select>
      {active && (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => apply("", "")}>
          <X aria-hidden />
          Limpar
        </Button>
      )}
    </div>
  );
}

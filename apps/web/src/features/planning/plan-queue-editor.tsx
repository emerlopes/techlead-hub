"use client";

import { type ExecutionPlanDetail, type PlanItem, planShapeIssues, PLAN_ITEMS_LIMIT } from "@tlh/shared-contracts";
import { ArrowDown, ArrowUp, Link2, Plus, Save, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FormError } from "@/components/app/form-error";
import { RetryButton } from "@/components/app/retry-button";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { blockingLevel, dependencyState, planItemState } from "@/lib/design-system/status";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";
import { formatBusinessDate, formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fractionToPercentInput, percentToFraction } from "../capacity/options";

export type QueueCandidate = { id: string; externalKey: string; title: string };

type Row = { workItemId: string; code: string; title: string; share: string; earliest: string; notes: string; item?: PlanItem };

const toRow = (item: PlanItem): Row => ({
  workItemId: item.workItem.id,
  code: item.workItem.externalKey,
  title: item.workItem.title,
  share: fractionToPercentInput(item.capacityShare),
  earliest: item.earliestStartDate ?? "",
  notes: item.notes ?? "",
  item,
});

const toInput = (row: Row) => ({
  workItemId: row.workItemId,
  capacityShare: row.share.trim() === "" ? null : (percentToFraction(row.share) ?? null),
  earliestStartDate: row.earliest || null,
  notes: row.notes || null,
});

/**
 * Fila do plano (§22.4, §22.5): ordem explícita (subir/descer), parcela da capacidade nos modos com
 * paralelismo, início mais cedo e observação. As mudanças ficam locais até "Salvar fila", que valida
 * com as mesmas regras da API (CA-014) e envia a fila inteira com a versão lida.
 */
export function PlanQueueEditor({ plan, candidates }: { plan: ExecutionPlanDetail; candidates: readonly QueueCandidate[] }) {
  const action = useApiAction();
  const initial = plan.items.map(toRow);
  const [rows, setRows] = useState<Row[]>(initial);
  const [adding, setAdding] = useState("");
  const readOnly = plan.status === "ARCHIVED";
  const withShares = plan.executionMode !== "SEQUENTIAL";
  const dirty = JSON.stringify(rows.map(toInput)) !== JSON.stringify(initial.map(toInput));

  const inputs = rows.map(toInput);
  const local = planShapeIssues({ executionMode: plan.executionMode, maxParallelItems: plan.maxParallelItems, items: inputs });
  const errors: Record<string, string> = {};
  for (const issue of [...local, ...(action.error?.details ?? [])]) {
    const key = "path" in issue ? issue.path : "";
    errors[key] ??= issue.message;
  }
  const available = candidates.filter((c) => !rows.some((r) => r.workItemId === c.id));

  const update = (index: number, patch: Partial<Row>) => setRows((list) => list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const move = (index: number, offset: -1 | 1) =>
    setRows((list) => {
      const next = [...list];
      const target = index + offset;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target] as Row, next[index] as Row];
      return next;
    });
  const add = () => {
    const candidate = candidates.find((c) => c.id === adding);
    if (!candidate) return;
    setRows((list) => [...list, { workItemId: candidate.id, code: candidate.externalKey, title: candidate.title, share: "", earliest: "", notes: "" }]);
    setAdding("");
  };
  const save = () => action.run(() => apiMutation("PATCH", `/execution-plans/${plan.id}`, { items: inputs, version: plan.version }));

  return (
    <div className="flex flex-col gap-3" aria-busy={action.pending}>
      <FormError error={action.error} action={action.error?.code === "CONFLICT" ? <RetryButton label="Recarregar" /> : undefined} />
      {errors.items && (
        <p className="text-xs text-danger-fg" role="alert">
          {errors.items}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Fila vazia. Adicione itens abertos do contexto na ordem em que devem ser executados.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border">
          {rows.map((row, index) => {
            const projection = row.item?.projection;
            const shareError = errors[`items.${index}.capacityShare`];
            const itemError = errors[`items.${index}.workItemId`];
            return (
              <li key={row.workItemId} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start gap-2">
                  <span className="mt-0.5 w-5 shrink-0 font-mono text-xs text-muted-foreground tabular">{index + 1}.</span>
                  <div className="flex min-w-48 flex-1 flex-col gap-1">
                    <Link href={`/work-items/${row.workItemId}`} className="flex min-w-0 items-baseline gap-1.5 text-sm hover:underline">
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{row.code}</span>
                      <span className="truncate font-medium">{row.title}</span>
                    </Link>
                    <span className="flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
                      {projection ? (
                        <StatusBadge meta={planItemState[projection.state]} size="sm" />
                      ) : (
                        !row.item && <span className="italic">Novo — salve para projetar</span>
                      )}
                      {row.item?.workItem.blocking && <StatusBadge meta={blockingLevel[row.item.workItem.blocking]} size="sm" variant="outline" />}
                      {row.item && <span className="tabular">Restante {formatHours(row.item.workItem.remainingHours)}</span>}
                      {projection?.startDate && (
                        <span className="tabular">
                          {formatBusinessDate(projection.startDate)} → {projection.finishDate ? formatBusinessDate(projection.finishDate) : "após o período"}
                        </span>
                      )}
                      {projection && projection.redistributedHours > 0 && (
                        <span className="tabular">{formatHours(projection.redistributedHours)} redistribuídas</span>
                      )}
                      {row.item?.constraints.map((c) => (
                        <span key={c.dependencyId} className="inline-flex items-center gap-1">
                          <Link2 className="size-3" aria-hidden />
                          {c.predecessor?.externalKey ?? c.externalReference}
                          <StatusBadge meta={dependencyState[c.state]} size="sm" variant="dot" />
                        </span>
                      ))}
                    </span>
                    {itemError && (
                      <p className="text-xs text-danger-fg" role="alert">
                        {itemError}
                      </p>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button variant="ghost" size="icon-sm" aria-label={`Subir ${row.code}`} disabled={index === 0} onClick={() => move(index, -1)}>
                        <ArrowUp aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Descer ${row.code}`}
                        disabled={index === rows.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remover ${row.code} da fila`}
                        onClick={() => setRows((list) => list.filter((_, i) => i !== index))}
                      >
                        <X aria-hidden />
                      </Button>
                    </div>
                  )}
                </div>
                {!readOnly && (
                  <div className="grid gap-2 pl-7 sm:grid-cols-[7rem_10rem_minmax(0,1fr)]">
                    {withShares ? (
                      <label className="flex flex-col gap-1 text-2xs text-muted-foreground">
                        Parcela (%)
                        <Input
                          inputMode="decimal"
                          className="font-mono"
                          placeholder={plan.executionMode === "HYBRID" ? "Divide" : ""}
                          value={row.share}
                          onChange={(e) => update(index, { share: e.target.value })}
                          aria-invalid={Boolean(shareError)}
                        />
                      </label>
                    ) : (
                      <span className="hidden sm:block" />
                    )}
                    <label className="flex flex-col gap-1 text-2xs text-muted-foreground">
                      Início mais cedo
                      <Input type="date" value={row.earliest} onChange={(e) => update(index, { earliest: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 text-2xs text-muted-foreground">
                      Observação
                      <Input value={row.notes} maxLength={500} onChange={(e) => update(index, { notes: e.target.value })} />
                    </label>
                    {shareError && (
                      <p className="text-xs text-danger-fg sm:col-span-3" role="alert">
                        {shareError}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {!readOnly && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              aria-label="Item a adicionar"
              className="w-auto min-w-0 flex-1"
              disabled={available.length === 0 || rows.length >= PLAN_ITEMS_LIMIT}
            >
              <option value="">{available.length === 0 ? "Nenhum item aberto disponível no contexto" : "Selecione um item…"}</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.externalKey} · {c.title}
                </option>
              ))}
            </Select>
            <Button variant="secondary" disabled={!adding} onClick={add}>
              <Plus aria-hidden />
              Adicionar à fila
            </Button>
          </div>
          <div className={cn("flex flex-wrap items-center justify-end gap-2", !dirty && "opacity-80")}>
            {dirty && <span className="mr-auto text-xs text-attention-fg">Alterações não salvas.</span>}
            <Button variant="ghost" disabled={!dirty || action.pending} onClick={() => setRows(initial)}>
              <Undo2 aria-hidden />
              Descartar
            </Button>
            <Button disabled={!dirty || action.pending || local.length > 0} onClick={save}>
              <Save aria-hidden />
              {action.pending ? "Salvando…" : "Salvar fila"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

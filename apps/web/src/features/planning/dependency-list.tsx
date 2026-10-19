"use client";

import type { WorkDependency } from "@tlh/shared-contracts";
import { ArrowRight, Globe, LockOpen, Trash2 } from "lucide-react";
import Link from "next/link";
import { FormError } from "@/components/app/form-error";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { dependencyState, dependencyType, executionStatus } from "@/lib/design-system/status";
import { apiMutation } from "@/lib/api/client";
import { useApiAction } from "@/lib/api/use-api-action";
import { formatBusinessDate } from "@/lib/format";

function ItemLink({ item }: { item: NonNullable<WorkDependency["predecessor"]> }) {
  return (
    <Link href={`/work-items/${item.id}`} title={item.title} className="inline-flex min-w-0 items-baseline gap-1.5 hover:underline">
      <span className="shrink-0 font-mono text-xs">{item.externalKey}</span>
      <span className="truncate text-sm">{item.title}</span>
      <StatusBadge meta={executionStatus[item.executionStatus]} size="sm" variant="dot" className="shrink-0" />
    </Link>
  );
}

/**
 * Dependências com tipo e situação no cálculo (§24.4). A externa pode ser liberada (§24.5); remover
 * pede confirmação e fica na auditoria. `readOnly` esconde as ações (relatórios).
 */
export function DependencyList({ dependencies, readOnly = false }: { dependencies: readonly WorkDependency[]; readOnly?: boolean }) {
  const action = useApiAction();
  return (
    <div className="flex flex-col gap-2">
      <FormError error={action.error} />
      <ul className="flex flex-col divide-y divide-border">
        {dependencies.map((d) => (
          <li key={d.id} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {d.predecessor ? (
                <ItemLink item={d.predecessor} />
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <Globe className="size-3.5 text-muted-foreground" aria-hidden />
                  {d.externalReference}
                </span>
              )}
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-label="condiciona" />
              <ItemLink item={d.successor} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
              <StatusBadge meta={dependencyType[d.dependencyType]} size="sm" variant="outline" />
              <StatusBadge meta={dependencyState[d.state]} size="sm" />
              {d.dependencyType === "EXTERNAL" && (
                <span className="tabular">
                  {d.actualReleaseDate
                    ? `Liberada em ${formatBusinessDate(d.actualReleaseDate)}`
                    : d.expectedReleaseDate
                      ? `Prevista para ${formatBusinessDate(d.expectedReleaseDate)}`
                      : "Sem data prevista"}
                </span>
              )}
              {d.notes && <span>· {d.notes}</span>}
              {!readOnly && (
                <span className="ml-auto flex flex-wrap gap-1.5">
                  {d.dependencyType === "EXTERNAL" && d.status === "OPEN" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={action.pending}
                      onClick={() => action.run(() => apiMutation("POST", `/work-dependencies/${d.id}/release`, { version: d.version }))}
                    >
                      <LockOpen aria-hidden />
                      Liberar hoje
                    </Button>
                  )}
                  <ConfirmButton
                    question="Remover a dependência?"
                    confirmLabel="Remover"
                    pending={action.pending}
                    variant="ghost"
                    onConfirm={() => action.run(() => apiMutation("DELETE", `/work-dependencies/${d.id}`))}
                    aria-label="Remover dependência"
                  >
                    <Trash2 aria-hidden />
                  </ConfirmButton>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

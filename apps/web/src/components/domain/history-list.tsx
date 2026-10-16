import type { HistoryEntry } from "@tlh/shared-contracts";
import { History } from "lucide-react";
import type { StatusMeta } from "@/lib/design-system/status";
import { formatDateTime } from "@/lib/format";
import { actionLabels, describeFields } from "@/lib/history-labels";
import { StatusBadge } from "./status-badge";

/**
 * Histórico de uma entidade a partir da auditoria (RNF-004): o que mudou e quando, com a transição
 * de situação quando houver. Nunca exibe valores pessoais (§44.5).
 */
export function HistoryList({
  entries,
  timeZone,
  statusMap,
  empty = "Sem alterações registradas.",
}: {
  entries: HistoryEntry[];
  timeZone: string;
  /** Mapa de status do `status.ts` para exibir transições. */
  statusMap?: Record<string, StatusMeta>;
  empty?: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <History className="size-4" aria-hidden />
        {empty}
      </p>
    );
  }
  return (
    <ol className="flex flex-col divide-y divide-border">
      {entries.map((entry) => {
        const from = entry.fromStatus ? statusMap?.[entry.fromStatus] : undefined;
        const to = entry.toStatus ? statusMap?.[entry.toStatus] : undefined;
        return (
          <li key={entry.id} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="font-medium">{actionLabels[entry.action] ?? entry.action}</span>
              <span className="text-subtle-foreground tabular">{formatDateTime(entry.occurredAt, timeZone)}</span>
            </div>
            {(from || to) && (
              <span className="flex flex-wrap items-center gap-1 text-2xs text-muted-foreground">
                {from && <StatusBadge meta={from} size="sm" variant="dot" />}→{to && <StatusBadge meta={to} size="sm" variant="dot" />}
              </span>
            )}
            {entry.fields.length > 0 && (
              <p className="text-2xs text-muted-foreground">Campos: {describeFields(entry.fields)}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

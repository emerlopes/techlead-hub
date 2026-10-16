import type { TrackingHistoryEntry } from "@tlh/shared-contracts";
import { History } from "lucide-react";
import { StatusBadge } from "@/components/domain/status-badge";
import { executionStatus, healthStatus } from "@/lib/design-system/status";
import { formatBusinessDate, formatDateTime, formatHours } from "@/lib/format";
import { describeFields } from "@/lib/history-labels";

/** Linha do tempo das fotografias do acompanhamento (RN-006, CA-006), da mais recente à mais antiga. */
export function TrackingHistory({ entries, timeZone }: { entries: TrackingHistoryEntry[]; timeZone: string }) {
  if (entries.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <History className="size-4" aria-hidden />
        Sem histórico.
      </p>
    );
  }
  return (
    <ol className="flex flex-col divide-y divide-border">
      {entries.map((h) => (
        <li key={h.id} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="font-medium first-letter:uppercase">{describeFields(h.changedFields)}</span>
            <span className="text-subtle-foreground tabular">{formatDateTime(h.changedAt, timeZone)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
            <StatusBadge meta={executionStatus[h.executionStatus]} size="sm" variant="dot" />
            {h.healthStatus && <StatusBadge meta={healthStatus[h.healthStatus]} size="sm" variant="dot" />}
            <span>Time: {h.executingTeam?.code ?? "—"}</span>
            <span>Responsável: {h.developer?.name ?? "—"}</span>
            <span className="tabular">Compromisso: {h.committedDate ? formatBusinessDate(h.committedDate) : "—"}</span>
            <span className="tabular">Previsão: {h.manualForecastDate ? formatBusinessDate(h.manualForecastDate) : "—"}</span>
            <span className="tabular">Restante: {formatHours(h.remainingEffortHours)}</span>
          </div>
          {h.statusNote && <p className="text-xs break-words text-muted-foreground">{h.statusNote}</p>}
        </li>
      ))}
    </ol>
  );
}

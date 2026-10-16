import { Star } from "lucide-react";
import Link from "next/link";
import { ContextChip } from "@/components/domain/domain-tag";
import { StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { membershipStatus, type StatusMeta } from "@/lib/design-system/status";
import { EndAssociationButton } from "./end-association-button";

export type AssociationRow = {
  id: string;
  href: string;
  title: string;
  code?: string;
  /** Situação do outro lado (projeto pausado, time inativo…). */
  status: StatusMeta;
  isPrimary?: boolean;
  startedAt: string;
  endedAt: string | null;
};

/**
 * Participações (§9): ativas com ação de encerrar, encerradas como histórico com o período
 * preservado (RN-025).
 */
export function AssociationList({
  rows,
  endpoint,
  timeZone,
  empty,
}: {
  rows: AssociationRow[];
  endpoint: "/team-projects" | "/team-developers";
  timeZone: string;
  empty: string;
}) {
  if (rows.length === 0) return <p className="py-2 text-xs text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map((row) => {
        const ended = row.endedAt !== null;
        return (
          <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {row.code && <ContextChip code={row.code} />}
              <Link href={row.href} className="min-w-0 truncate text-sm font-medium hover:underline">
                {row.title}
              </Link>
              {row.isPrimary && (
                <Badge tone="delivery" size="sm">
                  <Star aria-hidden />
                  Principal
                </Badge>
              )}
              <StatusBadge meta={row.status} size="sm" variant="dot" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular">
                {formatDate(row.startedAt, timeZone)}
                {ended && ` → ${formatDate(row.endedAt ?? "", timeZone)}`}
              </span>
              {ended ? (
                <StatusBadge meta={membershipStatus.ENDED} size="sm" />
              ) : (
                <EndAssociationButton endpoint={`${endpoint}/${row.id}/end`} label={`Encerrar participação: ${row.title}`} />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

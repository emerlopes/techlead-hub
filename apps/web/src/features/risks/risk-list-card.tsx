import Link from "next/link";
import { StatusBadge } from "@/components/domain/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { blockingLevel, riskSeverity, riskType } from "@/lib/design-system/status";

type RiskLine = {
  id: string;
  title: string;
  type: "RISK" | "IMPEDIMENT";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  blockingLevel: "FULL" | "PARTIAL" | null;
};

/** Riscos e impedimentos abertos de um contexto, com atalho para registrar já vinculado (§16.2). */
export function RiskListCard({ risks, newHref, empty }: { risks: RiskLine[]; newHref: string; empty: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riscos e impedimentos</CardTitle>
        <CardAction>
          <Link href={newHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Registrar
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {risks.length === 0 ? (
          <p className="text-xs text-muted-foreground">{empty}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {risks.map((r) => (
              <li key={r.id} className="flex flex-col gap-1">
                <Link href={`/risks/${r.id}`} className="text-sm font-medium break-words hover:underline">
                  {r.title}
                </Link>
                <span className="flex flex-wrap gap-1">
                  <StatusBadge meta={riskType[r.type]} size="sm" />
                  <StatusBadge meta={riskSeverity[r.severity]} size="sm" variant="outline" />
                  {r.blockingLevel && <StatusBadge meta={blockingLevel[r.blockingLevel]} size="sm" variant="outline" />}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

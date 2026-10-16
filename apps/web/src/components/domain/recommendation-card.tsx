import { Check, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  impact as impactMap,
  recommendationStatus,
  type Impact,
  type RecommendationStatus,
} from "@/lib/design-system/status";
import { StatusBadge } from "./status-badge";

/**
 * Recomendação de planejamento (§28). O sistema sugere; o Tech Lead decide.
 * Sempre mostra explicação + impactos positivos E negativos (CA-028) e nunca
 * oferece "aplicar" sem passar por aprovação.
 */
export function RecommendationCard({
  title,
  explanation,
  status,
  impact,
  positives,
  negatives,
  className,
}: {
  title: string;
  explanation: string;
  status: RecommendationStatus;
  impact: Impact;
  positives: string[];
  negatives: string[];
  className?: string;
}) {
  const pending = status === "GENERATED" || status === "REVIEWING";
  const terminal = status === "EXPIRED" || status === "REJECTED";
  return (
    <Card className={cn(terminal && "opacity-70", className)}>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recomendação
          </span>
          <StatusBadge meta={recommendationStatus[status]} size="sm" />
          <StatusBadge meta={impactMap[impact]} size="sm" variant="outline" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{explanation}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <ImpactList kind="positive" items={positives} />
          <ImpactList kind="negative" items={negatives} />
        </div>
      </div>
      {pending && (
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm">
            <X /> Rejeitar
          </Button>
          <Button variant="outline" size="sm">
            Simular
          </Button>
          <Button size="sm">
            <Check /> Aprovar
          </Button>
        </div>
      )}
      {status === "APPROVED" && (
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Aprovada · a aplicação revalida a versão do planejamento
          <Button size="sm">Aplicar</Button>
        </div>
      )}
    </Card>
  );
}

function ImpactList({ kind, items }: { kind: "positive" | "negative"; items: string[] }) {
  const positive = kind === "positive";
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <div
      className={cn(
        "rounded-md border p-2.5",
        positive ? "border-success/25 bg-success-subtle/60" : "border-warning/25 bg-warning-subtle/60",
      )}
    >
      <p className={cn("mb-1 flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide", positive ? "text-success-fg" : "text-warning-fg")}>
        <Icon className="size-3" aria-hidden />
        {positive ? "Ganhos" : "Efeitos colaterais"}
      </p>
      {items.length ? (
        <ul className="flex flex-col gap-0.5 text-xs">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs italic text-muted-foreground">Nenhum identificado</p>
      )}
    </div>
  );
}

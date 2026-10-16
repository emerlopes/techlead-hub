import { Calculator, Hand } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

function formatDate(iso: string) {
  return fmt.format(new Date(`${iso}T12:00:00`)).replace(".", "");
}

/**
 * Compromisso × previsão. Nunca confundir previsão manual com calculada (§26.3),
 * e nunca inventar data: sem previsão → "Sem previsão".
 */
export function DateDelta({
  committed,
  forecast,
  delayBusinessDays,
  source = "CALCULATED",
  className,
}: {
  committed: string;
  forecast: string | null;
  /** Diferença em dias úteis (positivo = atraso). */
  delayBusinessDays?: number | null;
  source?: "MANUAL" | "CALCULATED";
  className?: string;
}) {
  const SourceIcon = source === "MANUAL" ? Hand : Calculator;
  const d = delayBusinessDays ?? 0;
  return (
    <div className={cn("inline-flex flex-col gap-0.5 text-xs tabular", className)}>
      <span className="text-muted-foreground">
        Compromisso <span className="font-medium text-foreground">{formatDate(committed)}</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <SourceIcon
          className="size-3 text-subtle-foreground"
          aria-label={source === "MANUAL" ? "Previsão manual" : "Previsão calculada"}
        />
        {forecast ? (
          <>
            <span className="font-medium">{formatDate(forecast)}</span>
            {d !== 0 && (
              <span
                className={cn(
                  "rounded px-1 font-mono text-2xs font-medium",
                  d > 0 ? "bg-danger-subtle text-danger-fg" : "bg-success-subtle text-success-fg",
                )}
              >
                {d > 0 ? `+${d}` : d} d.u.
              </span>
            )}
          </>
        ) : (
          <span className="italic text-muted-foreground">Sem previsão</span>
        )}
      </span>
    </div>
  );
}

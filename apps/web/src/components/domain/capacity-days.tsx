import type { CapacityDayDto } from "@tlh/shared-contracts";
import { formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "narrow", timeZone: "UTC" });
const dayOfMonth = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: "UTC" });

/**
 * Capacidade dia a dia (§18.3): altura = jornada nominal; preenchido = capacidade efetiva;
 * hachura = indisponível; borda tracejada = sem jornada (capacidade desconhecida, §3.4);
 * marcador vermelho = alocado acima da capacidade efetiva do dia.
 */
export function CapacityDays({ days, className }: { days: readonly CapacityDayDto[]; className?: string }) {
  const max = Math.max(8, ...days.map((d) => d.nominal));
  return (
    <ol aria-label="Capacidade por dia" className={cn("relative flex gap-1 overflow-x-auto pb-1 [scrollbar-width:thin]", className)}>
      {days.map((d) => {
        const date = new Date(`${d.date}T12:00:00Z`);
        const over = d.allocated - d.effective > 0.01;
        const title = d.scheduled
          ? `${d.date}: jornada ${formatHours(d.nominal)}, indisponível ${formatHours(d.unavailable)}, efetiva ${formatHours(d.effective)}, alocada ${formatHours(d.allocated)}`
          : `${d.date}: sem jornada cadastrada`;
        return (
          <li key={d.date} title={title} className="flex w-7 shrink-0 flex-col items-center gap-1">
            <div
              className={cn(
                "relative flex h-14 w-4 flex-col-reverse overflow-hidden rounded-sm bg-secondary",
                !d.scheduled && "border border-dashed border-border-strong bg-hatch",
              )}
            >
              {d.scheduled && d.nominal > 0 && (
                <>
                  <span className="w-full bg-capacity" style={{ height: `${(d.effective / max) * 100}%` }} />
                  <span className="w-full bg-secondary" style={{ height: `${((d.nominal - d.unavailable - d.effective) / max) * 100}%` }} />
                  <span className="w-full bg-hatch" style={{ height: `${(d.unavailable / max) * 100}%` }} />
                </>
              )}
              {over && <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-danger" />}
            </div>
            <span className="text-2xs leading-none text-muted-foreground uppercase">{weekday.format(date)}</span>
            <span className="font-mono text-2xs leading-none tabular">{dayOfMonth.format(date)}</span>
            <span className="sr-only">{title}</span>
          </li>
        );
      })}
    </ol>
  );
}

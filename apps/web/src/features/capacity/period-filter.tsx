import { addDays, CAPACITY_DEFAULT_DAYS, CAPACITY_MAX_DAYS, type Period } from "@tlh/shared-contracts";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { withQuery } from "@/lib/search-params";

/**
 * Período das visões de capacidade, na URL (`?from&to`). Funciona sem JavaScript; atalhos para
 * 2 e 4 semanas a partir de hoje. Horizonte máximo de `CAPACITY_MAX_DAYS` (§25.6).
 */
export function PeriodFilter({
  path,
  period,
  today,
  params = {},
}: {
  path: string;
  period: Period;
  today: string;
  /** Outros parâmetros da página que precisam ser preservados. */
  params?: Record<string, string | undefined>;
}) {
  const presets = [
    { value: "2w", label: "2 semanas", from: today, to: addDays(today, CAPACITY_DEFAULT_DAYS - 1) },
    { value: "4w", label: "4 semanas", from: today, to: addDays(today, 27) },
    { value: "12w", label: "12 semanas", from: today, to: addDays(today, 83) },
  ];
  const current = presets.find((p) => p.from === period.from && p.to === period.to)?.value ?? "";
  return (
    <div className="flex flex-wrap items-end gap-3">
      <SegmentedNav
        label="Período"
        current={current}
        items={presets.map((p) => ({ value: p.value, label: p.label, href: withQuery(path, { ...params, from: p.from, to: p.to }) }))}
      />
      <form method="get" action={path} className="flex flex-wrap items-end gap-2" aria-label="Período personalizado">
        {Object.entries(params).map(([key, value]) => value && <input key={key} type="hidden" name={key} value={value} />)}
        <div className="flex flex-col gap-1">
          <Label htmlFor="period-from">De</Label>
          <Input id="period-from" name="from" type="date" defaultValue={period.from} className="w-36" required />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="period-to">Até</Label>
          <Input id="period-to" name="to" type="date" defaultValue={period.to} className="w-36" required />
        </div>
        <Button type="submit" variant="outline" title={`Até ${CAPACITY_MAX_DAYS} dias`}>
          <CalendarRange aria-hidden />
          Aplicar
        </Button>
      </form>
    </div>
  );
}

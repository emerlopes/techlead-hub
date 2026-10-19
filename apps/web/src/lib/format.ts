/** Data e hora em pt-BR no fuso do workspace (§35.3). */
export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}

const businessDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
const businessDateLong = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** Data de negócio `YYYY-MM-DD` (§35.3) sem conversão de fuso: "16 de out". */
export function formatBusinessDate(isoDate: string): string {
  return businessDate.format(new Date(`${isoDate}T12:00:00Z`)).replace(".", "");
}

const businessDateNumeric = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" });

/** Data de negócio com ano, para textos copiados para fora do hub: "16/10/2026". */
export function formatBusinessDateNumeric(isoDate: string): string {
  return businessDateNumeric.format(new Date(`${isoDate}T12:00:00Z`));
}

/** "sexta-feira, 16 de outubro". */
export function formatBusinessDateLong(isoDate: string): string {
  return businessDateLong.format(new Date(`${isoDate}T12:00:00Z`));
}

/** Somente a data de um instante, no fuso do workspace. */
export function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone }).format(new Date(iso));
}

const hours = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** Horas com decimal em pt-BR; sem valor → "—" (§3.4). */
export function formatHours(value: number | null): string {
  return value === null ? "—" : `${hours.format(value)} h`;
}

const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

/** Fração 0–1 como percentual em pt-BR ("75%"). */
export function formatPercent(fraction: number): string {
  return percent.format(fraction);
}

/** Valor de uma alocação (§20.3): "50%" ou "10 h por semana". */
export function formatAllocationValue(a: { allocationType: "PERCENTAGE" | "HOURS"; value: number; period: "DAY" | "WEEK" | null }): string {
  if (a.allocationType === "PERCENTAGE") return formatPercent(a.value);
  return `${formatHours(a.value)} ${a.period === "DAY" ? "por dia" : "por semana"}`;
}

/** Período de datas de negócio: "19 de out – 25 de out" ou um só dia. */
export function formatBusinessRange(from: string, to: string): string {
  return from === to ? formatBusinessDate(from) : `${formatBusinessDate(from)} – ${formatBusinessDate(to)}`;
}

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

/** Data e hora em pt-BR no fuso do workspace (§35.3). */
export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}

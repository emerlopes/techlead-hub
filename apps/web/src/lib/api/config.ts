/** URL interna da API, lida em tempo de execução (Docker: `http://api:4000`). */
export function apiBaseUrl(): string {
  return process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000";
}

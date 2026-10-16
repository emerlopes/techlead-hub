/** Fila única de planejamento; previsões, cenários e recomendações entram nas Etapas 6–8. */
export const PLANNING_QUEUE = "planning";

export type JobHandler = (data: unknown) => Promise<unknown>;

/**
 * `system.ping` valida o caminho API → Redis → worker desde a fundação.
 * Handlers devem ser idempotentes e recuperáveis (RNF-015).
 */
export const handlers: Record<string, JobHandler> = {
  "system.ping": async () => ({ pong: true, at: new Date().toISOString() }),
};

export async function dispatch(name: string, data: unknown): Promise<unknown> {
  const handler = handlers[name];
  if (!handler) throw new Error(`Job desconhecido: ${name}`);
  return handler(data);
}

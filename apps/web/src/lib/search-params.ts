/** Primeiro valor de um parâmetro de busca (`?a=1&a=2` → `"1"`). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Normaliza os `searchParams` de uma página para um objeto simples de strings. */
export function flatParams(params: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, firstParam(value)]));
}

/** Monta a query string ignorando valores vazios. */
export function withQuery(path: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

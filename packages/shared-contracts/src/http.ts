/** Prefixo versionado de toda a API REST (§36.1). */
export const API_PREFIX = "/api/v1";

/** Cookie HttpOnly que carrega o token opaco da sessão (§44.2). */
export const SESSION_COOKIE = "tlh_session";

/**
 * Cabeçalho exigido em toda requisição que altera estado. Um formulário ou site de terceiros
 * não consegue enviá-lo sem preflight CORS (que a API não libera), o que bloqueia CSRF (§44.2).
 */
export const CSRF_HEADER = "x-tlh-csrf";
export const CSRF_HEADER_VALUE = "1";

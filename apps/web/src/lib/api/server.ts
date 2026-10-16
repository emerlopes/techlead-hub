import "server-only";
import {
  API_PREFIX,
  authStatusSchema,
  meSchema,
  SESSION_COOKIE,
  type AuthStatus,
  type Me,
} from "@tlh/shared-contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { z } from "zod";
import { apiBaseUrl } from "./config";

export type Loaded<T> = { ok: true; data: T } | { ok: false; reason: "unavailable" | "not_found" };

async function apiGet(path: string, withSession: boolean): Promise<Response | null> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (withSession) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return new Response(null, { status: 401 });
    headers.cookie = `${SESSION_COOKIE}=${encodeURIComponent(token)}`;
  }
  try {
    return await fetch(`${apiBaseUrl()}${API_PREFIX}${path}`, { headers, cache: "no-store" });
  } catch {
    return null;
  }
}

export const loadAuthStatus = cache(async (): Promise<Loaded<AuthStatus>> => {
  const response = await apiGet("/auth/status", false);
  if (!response?.ok) return { ok: false, reason: "unavailable" };
  return { ok: true, data: authStatusSchema.parse(await response.json()) };
});

/** Sessão atual ou `null` se ausente/expirada. Deduplicada por requisição. */
export const loadMe = cache(async (): Promise<Loaded<Me | null>> => {
  const response = await apiGet("/auth/me", true);
  if (!response) return { ok: false, reason: "unavailable" };
  if (response.status === 401) return { ok: true, data: null };
  if (!response.ok) return { ok: false, reason: "unavailable" };
  return { ok: true, data: meSchema.parse(await response.json()) };
});

/** Exige sessão válida (§44.3): sem sessão, redireciona para o login. */
export async function requireMe(): Promise<Loaded<Me>> {
  const result = await loadMe();
  if (!result.ok) return result;
  if (!result.data) redirect("/login");
  return { ok: true, data: result.data };
}

/**
 * Leitura autenticada de um recurso da API, validada pelo schema compartilhado. Sem sessão →
 * login; 404 → `not_found` (a página chama `notFound()`); demais falhas → `unavailable`.
 */
export async function loadApi<S extends z.ZodType>(path: string, schema: S): Promise<Loaded<z.output<S>>> {
  const response = await apiGet(path, true);
  if (!response) return { ok: false, reason: "unavailable" };
  if (response.status === 401) redirect("/login");
  if (response.status === 404) return { ok: false, reason: "not_found" };
  if (!response.ok) return { ok: false, reason: "unavailable" };
  const parsed = schema.safeParse(await response.json());
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, reason: "unavailable" };
}

/** Monta a query string ignorando valores vazios. */
export function withQuery(path: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

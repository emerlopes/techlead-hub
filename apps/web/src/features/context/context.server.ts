import "server-only";
import { cookies } from "next/headers";
import { CONTEXT_COOKIE, parseContextCookie, type SelectedContext } from "./context-cookie";

/** Contexto selecionado. Lê cookies: precisa estar dentro de <Suspense> (Cache Components). */
export async function readContext(): Promise<SelectedContext> {
  return parseContextCookie((await cookies()).get(CONTEXT_COOKIE)?.value);
}

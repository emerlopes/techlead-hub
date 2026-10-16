"use server";

import { cookies } from "next/headers";
import { CONTEXT_COOKIE, parseContextCookie } from "./context-cookie";

/** Grava o contexto escolhido; valores inválidos são descartados pelo próprio parser. */
export async function setContext(teamId: string, projectId: string): Promise<void> {
  const context = parseContextCookie(
    JSON.stringify({ teamId: teamId || undefined, projectId: projectId || undefined }),
  );
  const store = await cookies();
  if (!context.teamId && !context.projectId) {
    store.delete(CONTEXT_COOKIE);
    return;
  }
  store.set(CONTEXT_COOKIE, JSON.stringify(context), { httpOnly: true, sameSite: "lax", path: "/" });
}

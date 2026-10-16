import { SESSION_COOKIE } from "@tlh/shared-contracts";
import type { CookieOptions, Response } from "express";
import type { Env } from "../../infrastructure/config/env";

function baseOptions(env: Env): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    // Lax mantém o cookie em navegações de topo (links) e o bloqueia em POSTs de outros sites.
    sameSite: "lax",
    path: "/",
  };
}

export function setSessionCookie(res: Response, env: Env, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, { ...baseOptions(env), expires: expiresAt });
}

export function clearSessionCookie(res: Response, env: Env): void {
  res.clearCookie(SESSION_COOKIE, baseOptions(env));
}

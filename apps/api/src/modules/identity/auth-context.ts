import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export type AuthContext = {
  sessionId: string;
  sessionExpiresAt: Date;
  userId: string;
  workspaceId: string;
};

export type AuthenticatedRequest = Request & { auth?: AuthContext };

/** Injeta o contexto da sessão validada pelo `SessionGuard`. */
export const CurrentAuth = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.auth) throw new Error("CurrentAuth usado em rota pública.");
  return request.auth;
});

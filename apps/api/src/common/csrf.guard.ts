import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { CSRF_HEADER, CSRF_HEADER_VALUE } from "@tlh/shared-contracts";
import type { Request } from "express";
import { ENV } from "../infrastructure/config/config.module";
import type { Env } from "../infrastructure/config/env";
import { ApiException } from "./api-exception";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Proteção CSRF (§44.2) em duas camadas para métodos que alteram estado:
 * cabeçalho customizado obrigatório (exige preflight CORS, que a API não libera) e,
 * quando o navegador envia `Origin`, ela precisa estar na lista de origens da web.
 */
export function isCsrfSafe(
  method: string,
  headers: Record<string, string | string[] | undefined>,
  allowedOrigins: readonly string[],
): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return true;
  if (headers[CSRF_HEADER] !== CSRF_HEADER_VALUE) return false;
  const origin = headers.origin;
  if (origin === undefined) return true;
  return typeof origin === "string" && allowedOrigins.includes(origin);
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (isCsrfSafe(request.method, request.headers, this.env.WEB_ORIGINS)) return true;
    throw new ApiException(403, "CSRF_REJECTED", "Requisição recusada pela proteção CSRF.");
  }
}

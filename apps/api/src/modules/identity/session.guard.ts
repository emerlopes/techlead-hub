import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SESSION_COOKIE } from "@tlh/shared-contracts";
import { ApiException } from "../../common/api-exception";
import { IS_PUBLIC } from "../../common/public.decorator";
import type { AuthenticatedRequest } from "./auth-context";
import { SessionService } from "./session.service";

/** Toda rota exige sessão válida, exceto as marcadas com `@Public()` (§44.3). */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token: unknown = request.cookies?.[SESSION_COOKIE];
    const auth = typeof token === "string" && token ? await this.sessions.resolve(token) : null;
    if (!auth) throw new ApiException(401, "UNAUTHENTICATED", "Sessão ausente ou expirada.");
    request.auth = auth;
    return true;
  }
}

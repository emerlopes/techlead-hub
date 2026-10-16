import { Inject, Injectable, Logger } from "@nestjs/common";
import type { AuthStatus, LoginInput, Me, setupSchema } from "@tlh/shared-contracts";
import type { z } from "zod";
import { ApiException } from "../../common/api-exception";
import { Prisma } from "../../generated/prisma/client";
import { ENV } from "../../infrastructure/config/config.module";
import type { Env } from "../../infrastructure/config/env";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { toWorkspaceDto } from "../workspace/workspace.mapper";
import type { AuthContext } from "./auth-context";
import { lockRemainingSeconds, registerFailedLogin } from "./login-lockout";
import { PasswordService } from "./password.service";
import { SessionService } from "./session.service";

type SetupData = z.output<typeof setupSchema>;
type IssuedSession = { me: Me; token: string; expiresAt: Date };

const INVALID_CREDENTIALS = "E-mail ou senha inválidos.";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async status(): Promise<AuthStatus> {
    return { setupRequired: (await this.prisma.user.count()) === 0 };
  }

  /** Configuração inicial do proprietário (§34.1): cria workspace + usuário uma única vez. */
  async setup(input: SetupData): Promise<IssuedSession> {
    if (!(await this.status()).setupRequired) throw this.setupDone();

    const passwordHash = await this.passwords.hash(input.password);
    let userId: string;
    try {
      userId = await this.prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: { name: input.workspaceName, timezone: input.timezone },
        });
        const user = await tx.user.create({
          data: { workspaceId: workspace.id, name: input.name, email: input.email, passwordHash },
        });
        await this.audit.record(
          {
            action: "auth.setup",
            entityType: "user",
            entityId: user.id,
            workspaceId: workspace.id,
            actorUserId: user.id,
          },
          tx,
        );
        return user.id;
      });
    } catch (error) {
      // A unicidade de `is_owner` resolve um setup concorrente (§44.1).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw this.setupDone();
      }
      throw error;
    }
    this.logger.log("Proprietário configurado.");
    return this.issueSession(userId);
  }

  async login(input: LoginInput, now = new Date()): Promise<IssuedSession> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      if ((await this.status()).setupRequired) {
        throw new ApiException(409, "SETUP_REQUIRED", "Configure o proprietário antes de entrar.");
      }
      await this.passwords.verifyAgainstDummy(input.password);
      throw new ApiException(401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS);
    }

    const remaining = lockRemainingSeconds(user.lockedUntil, now);
    if (remaining > 0) throw this.tooManyAttempts(remaining);

    if (!(await this.passwords.verify(user.passwordHash, input.password))) {
      const next = registerFailedLogin(
        user,
        { maxAttempts: this.env.LOGIN_MAX_ATTEMPTS, lockMinutes: this.env.LOGIN_LOCK_MINUTES },
        now,
      );
      const justLocked = lockRemainingSeconds(next.lockedUntil, now) > 0;
      await this.prisma.user.update({ where: { id: user.id }, data: next });
      await this.audit.record({
        action: justLocked ? "auth.login_locked" : "auth.login_failed",
        entityType: "user",
        entityId: user.id,
        workspaceId: user.workspaceId,
      });
      if (justLocked) throw this.tooManyAttempts(lockRemainingSeconds(next.lockedUntil, now));
      throw new ApiException(401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
    });
    await this.audit.record({
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
    return this.issueSession(user.id);
  }

  async logout(auth: AuthContext): Promise<void> {
    await this.sessions.revoke(auth.sessionId);
    await this.audit.record({
      action: "auth.logout",
      entityType: "session",
      entityId: auth.sessionId,
      workspaceId: auth.workspaceId,
      actorUserId: auth.userId,
    });
  }

  me(auth: AuthContext): Promise<Me> {
    return this.buildMe(auth.userId, auth.sessionExpiresAt);
  }

  private async buildMe(userId: string, sessionExpiresAt: Date): Promise<Me> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { workspace: true },
    });
    if (!user) throw new ApiException(401, "UNAUTHENTICATED", "Sessão ausente ou expirada.");
    return {
      user: { id: user.id, name: user.name, email: user.email },
      workspace: toWorkspaceDto(user.workspace),
      session: { expiresAt: sessionExpiresAt.toISOString() },
    };
  }

  private async issueSession(userId: string): Promise<IssuedSession> {
    const { token, expiresAt } = await this.sessions.create(userId);
    return { me: await this.buildMe(userId, expiresAt), token, expiresAt };
  }

  private setupDone(): ApiException {
    return new ApiException(409, "SETUP_ALREADY_DONE", "O proprietário já foi configurado.");
  }

  private tooManyAttempts(retryAfterSeconds: number): ApiException {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return new ApiException(
      429,
      "TOO_MANY_ATTEMPTS",
      `Muitas tentativas. Tente novamente em ${minutes} min.`,
      { retryAfterSeconds },
    );
  }
}

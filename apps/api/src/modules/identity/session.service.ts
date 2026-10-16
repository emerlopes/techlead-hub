import { Inject, Injectable } from "@nestjs/common";
import { ENV } from "../../infrastructure/config/config.module";
import type { Env } from "../../infrastructure/config/env";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { AuthContext } from "./auth-context";
import { generateSessionToken, hashSessionToken } from "./session-token";

/** Evita uma escrita por requisição: `last_seen_at` só é atualizado após este intervalo. */
const TOUCH_INTERVAL_MS = 5 * 60_000;

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  get ttlMs(): number {
    return this.env.SESSION_TTL_HOURS * 3_600_000;
  }

  async create(userId: string, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
    const token = generateSessionToken();
    const expiresAt = new Date(now.getTime() + this.ttlMs);
    await this.prisma.session.create({
      data: { userId, tokenHash: hashSessionToken(token), createdAt: now, lastSeenAt: now, expiresAt },
    });
    return { token, expiresAt };
  }

  /** Valida sessão e workspace (§44.3). Sessões expiradas ou revogadas são rejeitadas. */
  async resolve(token: string, now = new Date()): Promise<AuthContext | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { select: { id: true, workspaceId: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= now) return null;

    if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: now } });
    }
    return {
      sessionId: session.id,
      sessionExpiresAt: session.expiresAt,
      userId: session.user.id,
      workspaceId: session.user.workspaceId,
    };
  }

  async revoke(sessionId: string, now = new Date()): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}

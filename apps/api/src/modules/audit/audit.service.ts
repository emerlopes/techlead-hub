import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

export type AuditAction =
  | "auth.setup"
  | "auth.login"
  | "auth.login_failed"
  | "auth.login_locked"
  | "auth.logout"
  | "workspace.updated";

export type AuditInput = {
  action: AuditAction;
  entityType: "user" | "workspace" | "session";
  entityId?: string;
  workspaceId?: string;
  actorUserId?: string;
  /** Somente dados não sensíveis: nunca senhas, tokens ou motivos pessoais (§44.5). */
  metadata?: Prisma.InputJsonValue;
};

type AuditClient = Pick<PrismaService, "auditEvent">;

/** Registro somente-inserção de eventos relevantes (§34.18, RNF-004, RNF-022). */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Aceita o cliente de uma transação para que o evento e a mudança sejam atômicos. */
  async record(event: AuditInput, client: AuditClient = this.prisma): Promise<void> {
    await client.auditEvent.create({ data: event });
  }
}

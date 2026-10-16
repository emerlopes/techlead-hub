import { Injectable } from "@nestjs/common";
import type { UpdateWorkspaceInput, Workspace } from "@tlh/shared-contracts";
import { ApiException } from "../../common/api-exception";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import { toWorkspaceDto } from "./workspace.mapper";

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(auth: AuthContext): Promise<Workspace> {
    const row = await this.prisma.workspace.findUnique({ where: { id: auth.workspaceId } });
    if (!row) throw new ApiException(404, "NOT_FOUND", "Workspace não encontrado.");
    return toWorkspaceDto(row);
  }

  /** Atualização com controle otimista: versão divergente devolve 409 em vez de sobrescrever. */
  async update(auth: AuthContext, input: UpdateWorkspaceInput): Promise<Workspace> {
    const { version, ...changes } = input;
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.workspace.updateMany({
        where: { id: auth.workspaceId, version },
        data: { ...changes, version: { increment: 1 } },
      });
      if (result.count === 0) {
        throw new ApiException(
          409,
          "CONFLICT",
          "O workspace foi alterado em outra sessão. Recarregue e tente novamente.",
        );
      }
      await this.audit.record(
        {
          action: "workspace.updated",
          entityType: "workspace",
          entityId: auth.workspaceId,
          workspaceId: auth.workspaceId,
          actorUserId: auth.userId,
          metadata: { fields: Object.keys(changes), fromVersion: version },
        },
        tx,
      );
      return toWorkspaceDto(await tx.workspace.findUniqueOrThrow({ where: { id: auth.workspaceId } }));
    });
  }
}

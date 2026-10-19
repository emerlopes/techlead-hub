import { Injectable } from "@nestjs/common";
import type { createExternalSourceSchema, ExternalSource, updateExternalSourceSchema } from "@tlh/shared-contracts";
import type { z } from "zod";
import { ApiException } from "../../common/api-exception";
import { assertVersionedUpdate, changedFields, isUniqueViolation } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";

const withCount = { _count: { select: { workItems: true } } } as const;

function duplicateName(name: string): ApiException {
  return new ApiException(409, "CONFLICT", `Já existe uma origem chamada ${name}.`, {
    details: [{ path: "name", message: "Nome já utilizado." }],
  });
}

/** Origens dos itens externos (§13.3). A URL é referência, não integração (§13.6). */
@Injectable()
export class ExternalSourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext): Promise<ExternalSource[]> {
    const rows = await this.prisma.externalSource.findMany({
      where: { workspaceId: auth.workspaceId },
      include: withCount,
      orderBy: { name: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      baseUrl: row.baseUrl,
      workItemCount: row._count.workItems,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      version: row.version,
    }));
  }

  async create(auth: AuthContext, input: z.output<typeof createExternalSourceSchema>): Promise<ExternalSource[]> {
    await this.prisma
      .$transaction(async (tx) => {
        const source = await tx.externalSource.create({ data: { ...input, workspaceId: auth.workspaceId } });
        await this.audit.record(
          {
            action: "external_source.created",
            entityType: "external_source",
            entityId: source.id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
          },
          tx,
        );
      })
      .catch((error: unknown) => {
        throw isUniqueViolation(error) ? duplicateName(input.name) : error;
      });
    return this.list(auth);
  }

  async update(auth: AuthContext, id: string, input: z.output<typeof updateExternalSourceSchema>): Promise<ExternalSource[]> {
    const { version, ...changes } = input;
    await this.prisma
      .$transaction(async (tx) => {
        const result = await tx.externalSource.updateMany({
          where: { id, workspaceId: auth.workspaceId, version },
          data: { ...changes, version: { increment: 1 } },
        });
        await assertVersionedUpdate(
          result.count,
          () => tx.externalSource.findFirst({ where: { id, workspaceId: auth.workspaceId }, select: { id: true } }),
          "Origem",
        );
        await this.audit.record(
          {
            action: "external_source.updated",
            entityType: "external_source",
            entityId: id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: { fields: changedFields(changes), fromVersion: version },
          },
          tx,
        );
      })
      .catch((error: unknown) => {
        throw isUniqueViolation(error) && changes.name ? duplicateName(changes.name) : error;
      });
    return this.list(auth);
  }

  /** Exclusão definitiva (§35.9). Itens externos dependem da origem (FK `Restrict`): só sai sem itens. */
  async remove(auth: AuthContext, id: string): Promise<void> {
    await this.audit.deleteEntity(
      { entityType: "external_source", entityId: id, workspaceId: auth.workspaceId, actorUserId: auth.userId, label: "Origem" },
      async (tx) => {
        const items = await tx.externalWorkItem.count({ where: { sourceId: id, workspaceId: auth.workspaceId } });
        if (items > 0) {
          throw new ApiException(409, "CONFLICT", `A origem tem ${items} ${items === 1 ? "item" : "itens"}. Exclua ou mova os itens antes.`);
        }
        return tx.externalSource.deleteMany({ where: { id, workspaceId: auth.workspaceId } });
      },
    );
  }
}

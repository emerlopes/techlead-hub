import { Injectable } from "@nestjs/common";
import {
  type createJournalEntrySchema,
  type JournalEntry,
  type journalListQuerySchema,
  type Paginated,
  type updateJournalEntrySchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { ApiException } from "../../common/api-exception";
import { workspaceToday } from "../../common/context-rules";
import { assertLinkTargets, type LinkInput, linkChanges } from "../../common/link-targets";
import { changedFields, fromIsoDate, isUniqueViolation, notFound, toIsoDate, versionConflict } from "../../common/persistence";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthContext } from "../identity/auth-context";
import { refSelect } from "../work-items/work-item.mapper";

const ENTITY = "Registro";
/** Limite de segurança dos acontecimentos lidos por relatório; uma sprint ou release fica muito abaixo dele. */
export const REPORT_JOURNAL_LIMIT = 500;

const entryInclude = {
  links: {
    include: {
      team: { select: refSelect },
      project: { select: refSelect },
      sprint: { select: { id: true, name: true } },
      release: { select: { id: true, name: true } },
      workItem: { select: { id: true, externalKey: true, title: true } },
      risk: { select: { id: true, title: true } },
    },
  },
} satisfies Prisma.JournalEntryInclude;
type EntryRow = Prisma.JournalEntryGetPayload<{ include: typeof entryInclude }>;

function toEntryDto(row: EntryRow): JournalEntry {
  const pick = <T>(fn: (link: EntryRow["links"][number]) => T | null): T[] => row.links.flatMap((link) => fn(link) ?? []);
  return {
    id: row.id,
    category: row.category,
    description: row.description,
    occurredOn: toIsoDate(row.occurredOn) ?? "",
    links: {
      teams: pick((l) => l.team),
      projects: pick((l) => l.project),
      sprints: pick((l) => l.sprint),
      releases: pick((l) => l.release),
      workItems: pick((l) => l.workItem),
      risks: pick((l) => l.risk),
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

function duplicateEntry(): ApiException {
  return new ApiException(409, "CONFLICT", "Este acontecimento já foi registrado nesta data (§17.4).", {
    details: [{ path: "description", message: "Registro duplicado." }],
  });
}

/** Diário de bordo (§17, §34.16). Relatórios só usam o que foi registrado aqui (§17.4). */
@Injectable()
export class JournalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(auth: AuthContext, query: z.output<typeof journalListQuerySchema>): Promise<Paginated<JournalEntry>> {
    const and: Prisma.JournalEntryWhereInput[] = [];
    // Time e projeto incluem acontecimentos das suas sprints, releases e itens (§17.3).
    if (query.teamId) {
      and.push({
        links: {
          some: {
            OR: [
              { teamId: query.teamId },
              { sprint: { teamId: query.teamId } },
              { workItem: { tracking: { executingTeamId: query.teamId } } },
            ],
          },
        },
      });
    }
    if (query.projectId) {
      and.push({
        links: {
          some: {
            OR: [{ projectId: query.projectId }, { release: { projectId: query.projectId } }, { workItem: { projectId: query.projectId } }],
          },
        },
      });
    }
    for (const [key, value] of [
      ["sprintId", query.sprintId],
      ["releaseId", query.releaseId],
      ["workItemId", query.workItemId],
      ["riskId", query.riskId],
    ] as const) {
      if (value) and.push({ links: { some: { [key]: value } } });
    }
    const where: Prisma.JournalEntryWhereInput = {
      workspaceId: auth.workspaceId,
      category: query.category,
      occurredOn: { gte: fromIsoDate(query.from) ?? undefined, lte: fromIsoDate(query.to) ?? undefined },
      AND: and,
    };
    const [total, rows] = await Promise.all([
      this.prisma.journalEntry.count({ where }),
      this.prisma.journalEntry.findMany({
        where,
        include: entryInclude,
        orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items: rows.map(toEntryDto), total, page: query.page, pageSize: query.pageSize };
  }

  /**
   * Acontecimentos para relatórios (§31): ligados diretamente à sprint/release ou a um dos itens, estes
   * só dentro do período quando informado (o item pode ter histórico de outras sprints).
   */
  async listForContexts(
    auth: AuthContext,
    contexts: { sprintId?: string; releaseId?: string; workItemIds: string[]; from?: string; to?: string },
  ): Promise<JournalEntry[]> {
    const or: Prisma.JournalEntryWhereInput[] = [
      {
        links: { some: { workItemId: { in: contexts.workItemIds } } },
        occurredOn: { gte: fromIsoDate(contexts.from) ?? undefined, lte: fromIsoDate(contexts.to) ?? undefined },
      },
    ];
    if (contexts.sprintId) or.push({ links: { some: { sprintId: contexts.sprintId } } });
    if (contexts.releaseId) or.push({ links: { some: { releaseId: contexts.releaseId } } });
    const rows = await this.prisma.journalEntry.findMany({
      where: { workspaceId: auth.workspaceId, OR: or },
      include: entryInclude,
      orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
      take: REPORT_JOURNAL_LIMIT,
    });
    return rows.map(toEntryDto);
  }

  async get(auth: AuthContext, id: string): Promise<JournalEntry> {
    const row = await this.prisma.journalEntry.findFirst({ where: { id, workspaceId: auth.workspaceId }, include: entryInclude });
    if (!row) throw notFound(ENTITY);
    return toEntryDto(row);
  }

  async create(auth: AuthContext, input: z.output<typeof createJournalEntrySchema>): Promise<JournalEntry> {
    const { links = {}, occurredOn, ...fields } = input;
    await assertLinkTargets(this.prisma, auth.workspaceId, links);
    // Data preenchida automaticamente com hoje no fuso do workspace, mas ajustável (§17.4).
    const day = occurredOn ?? (await workspaceToday(this.prisma, auth.workspaceId));
    const id = await this.prisma
      .$transaction(async (tx) => {
        const entry = await tx.journalEntry.create({
          data: { ...fields, occurredOn: fromIsoDate(day) ?? new Date(), workspaceId: auth.workspaceId },
        });
        await this.replaceLinks(tx, entry.id, links);
        await this.audit.record(
          {
            action: "journal_entry.created",
            entityType: "journal_entry",
            entityId: entry.id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: { category: entry.category },
          },
          tx,
        );
        return entry.id;
      })
      .catch((error: unknown) => {
        throw isUniqueViolation(error) ? duplicateEntry() : error;
      });
    return this.get(auth, id);
  }

  async update(auth: AuthContext, id: string, input: z.output<typeof updateJournalEntrySchema>): Promise<JournalEntry> {
    const { version, links, occurredOn, ...fields } = input;
    if (links) await assertLinkTargets(this.prisma, auth.workspaceId, links);
    await this.prisma
      .$transaction(async (tx) => {
        const result = await tx.journalEntry.updateMany({
          where: { id, workspaceId: auth.workspaceId, version },
          data: { ...fields, occurredOn: fromIsoDate(occurredOn) ?? undefined, version: { increment: 1 } },
        });
        if (result.count === 0) {
          const exists = await tx.journalEntry.findFirst({ where: { id, workspaceId: auth.workspaceId }, select: { id: true } });
          throw exists ? versionConflict(ENTITY) : notFound(ENTITY);
        }
        if (links) await this.replaceLinks(tx, id, links);
        await this.audit.record(
          {
            action: "journal_entry.updated",
            entityType: "journal_entry",
            entityId: id,
            workspaceId: auth.workspaceId,
            actorUserId: auth.userId,
            metadata: { fields: changedFields({ ...input }), fromVersion: version },
          },
          tx,
        );
      })
      .catch((error: unknown) => {
        throw isUniqueViolation(error) ? duplicateEntry() : error;
      });
    return this.get(auth, id);
  }

  private async replaceLinks(tx: Prisma.TransactionClient, entryId: string, links: LinkInput): Promise<void> {
    for (const { column, ids } of linkChanges(links)) {
      await tx.journalLink.deleteMany({ where: { entryId, [column]: { not: null, notIn: ids } } });
      await tx.journalLink.createMany({
        data: ids.map((target) => ({ entryId, [column]: target }) as Prisma.JournalLinkCreateManyInput),
        skipDuplicates: true,
      });
    }
  }

  async remove(auth: AuthContext, id: string): Promise<void> {
    await this.audit.deleteEntity(
      { entityType: "journal_entry", entityId: id, workspaceId: auth.workspaceId, actorUserId: auth.userId, label: ENTITY },
      (tx) => tx.journalEntry.deleteMany({ where: { id, workspaceId: auth.workspaceId } }),
    );
  }
}

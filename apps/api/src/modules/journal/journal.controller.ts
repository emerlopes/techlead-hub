import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createJournalEntrySchema,
  type JournalEntry,
  journalListQuerySchema,
  type Paginated,
  updateJournalEntrySchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { UuidParamPipe } from "../../common/uuid-param.pipe";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { type AuthContext, CurrentAuth } from "../identity/auth-context";
import { JournalService } from "./journal.service";

/** Diário de bordo (§17). Acréscimo ao §36. */
@Controller("journal")
export class JournalController {
  constructor(private readonly journal: JournalService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(journalListQuerySchema)) query: z.output<typeof journalListQuerySchema>,
  ): Promise<Paginated<JournalEntry>> {
    return this.journal.list(auth, query);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createJournalEntrySchema)) body: z.output<typeof createJournalEntrySchema>,
  ): Promise<JournalEntry> {
    return this.journal.create(auth, body);
  }

  @Get(":id")
  get(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<JournalEntry> {
    return this.journal.get(auth, id);
  }

  @Patch(":id")
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateJournalEntrySchema)) body: z.output<typeof updateJournalEntrySchema>,
  ): Promise<JournalEntry> {
    return this.journal.update(auth, id, body);
  }
}

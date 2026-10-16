import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query } from "@nestjs/common";
import {
  completeTaskSchema,
  createTaskSchema,
  type FocusQueue,
  type Task,
  taskListQuerySchema,
  updateFocusQueueSchema,
  type UpdateFocusQueueInput,
  updateTaskSchema,
} from "@tlh/shared-contracts";
import type { z } from "zod";
import { UuidParamPipe } from "../../common/uuid-param.pipe";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { type AuthContext, CurrentAuth } from "../identity/auth-context";
import { FocusQueueService } from "./focus-queue.service";
import { TasksService } from "./tasks.service";

/** Atividades pessoais (§36.6). */
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(taskListQuerySchema)) query: z.output<typeof taskListQuerySchema>,
  ): Promise<Task[]> {
    return this.tasks.list(auth, query);
  }

  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createTaskSchema)) body: z.output<typeof createTaskSchema>,
  ): Promise<Task> {
    return this.tasks.create(auth, body);
  }

  @Get(":id")
  get(@CurrentAuth() auth: AuthContext, @Param("id", UuidParamPipe) id: string): Promise<Task> {
    return this.tasks.get(auth, id);
  }

  @Patch(":id")
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) body: z.output<typeof updateTaskSchema>,
  ): Promise<Task> {
    return this.tasks.update(auth, id, body);
  }

  @Post(":id/complete")
  @HttpCode(200)
  complete(
    @CurrentAuth() auth: AuthContext,
    @Param("id", UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(completeTaskSchema)) body: z.output<typeof completeTaskSchema>,
  ): Promise<Task> {
    return this.tasks.complete(auth, id, body);
  }
}

/** Fila de foco (§36.6). */
@Controller("focus-queue")
export class FocusQueueController {
  constructor(private readonly focus: FocusQueueService) {}

  @Get()
  get(@CurrentAuth() auth: AuthContext): Promise<FocusQueue> {
    return this.focus.get(auth);
  }

  @Put()
  replace(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(updateFocusQueueSchema)) body: UpdateFocusQueueInput,
  ): Promise<FocusQueue> {
    return this.focus.replace(auth, body);
  }
}

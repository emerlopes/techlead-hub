import { Module } from "@nestjs/common";
import { FocusQueueService } from "./focus-queue.service";
import { FocusQueueController, TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  controllers: [TasksController, FocusQueueController],
  providers: [TasksService, FocusQueueService],
  exports: [TasksService, FocusQueueService],
})
export class TasksModule {}

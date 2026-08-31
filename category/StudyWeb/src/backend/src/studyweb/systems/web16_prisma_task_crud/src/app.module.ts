import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { TasksController } from "./tasks/tasks.controller";
import { TasksService } from "./tasks/tasks.service";

@Module({
  controllers: [TasksController],
  providers: [PrismaService, TasksService],
})
export class AppModule {}

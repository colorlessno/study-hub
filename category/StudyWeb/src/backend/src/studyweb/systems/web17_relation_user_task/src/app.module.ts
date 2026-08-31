import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { TasksController } from "./tasks/tasks.controller";
import { TasksService } from "./tasks/tasks.service";
import { UsersController } from "./users/users.controller";
import { UsersService } from "./users/users.service";

@Module({
  controllers: [UsersController, TasksController],
  providers: [PrismaService, UsersService, TasksService],
})
export class AppModule {}

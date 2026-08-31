import { Body, Controller, Get, Post } from "@nestjs/common";
import { CreateTaskDto } from "./dto/create-task.dto";
import { TasksService } from "./tasks.service";

@Controller("tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get("guide")
  guide() {
    return {
      theme: "web14 NestJSのデータ登録API",
      operation: "POST /tasks",
      note: "このテーマはDBへ保存せず、入力検証と応答作成を確認します。",
    };
  }

  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }
}

import { Injectable } from "@nestjs/common";
import { CreateTaskDto } from "./dto/create-task.dto";

@Injectable()
export class TasksService {
  create(dto: CreateTaskDto) {
    return {
      id: `task-${Date.now()}`,
      title: dto.title,
      description: dto.description ?? "",
      createdAt: new Date().toISOString(),
    };
  }
}

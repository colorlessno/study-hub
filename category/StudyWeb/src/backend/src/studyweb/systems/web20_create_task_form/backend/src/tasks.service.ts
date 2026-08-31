import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { CreateTaskDto } from "./create-task.dto";

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.task.findMany({ orderBy: { createdAt: "desc" } });
  }

  create(dto: CreateTaskDto) {
    return this.prisma.task.create({ data: { title: dto.title } });
  }
}

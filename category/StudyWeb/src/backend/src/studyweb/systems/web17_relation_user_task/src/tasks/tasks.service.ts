import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateTaskDto } from "./dto/create-task.dto";

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaskDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException("user_not_found");
    }
    return this.prisma.task.create({
      data: { title: dto.title, userId: dto.userId },
      include: { user: true },
    });
  }

  findAll() {
    return this.prisma.task.findMany({ include: { user: true } });
  }
}

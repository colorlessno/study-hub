import { Controller, Get } from "@nestjs/common";

let requestCount = 0;

@Controller("tasks")
export class TasksController {
  @Get()
  async findAll() {
    await new Promise((resolve) => setTimeout(resolve, 600));
    requestCount += 1;
    return [
      { id: "1", title: "useQueryで取得する", done: true },
      { id: "2", title: `refetch確認 ${requestCount}`, done: false },
    ];
  }
}

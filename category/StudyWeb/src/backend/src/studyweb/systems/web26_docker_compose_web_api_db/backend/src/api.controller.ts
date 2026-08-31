import { Controller, Get } from "@nestjs/common";
import { DbService } from "./db.service";

@Controller()
export class ApiController {
  constructor(private readonly db: DbService) {}

  @Get("health")
  health() {
    return { ok: true, service: "web26 api" };
  }

  @Get("tasks")
  async tasks() {
    const result = await this.db.query<{ id: number; title: string; created_at: string }>(
      "SELECT id, title, created_at FROM tasks ORDER BY id"
    );
    return result.rows;
  }
}

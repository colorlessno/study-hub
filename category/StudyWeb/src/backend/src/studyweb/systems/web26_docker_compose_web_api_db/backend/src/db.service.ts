import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Pool, QueryResultRow } from "pg";

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  query<T extends QueryResultRow>(sql: string) {
    return this.pool.query<T>(sql);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}

import { Module } from "@nestjs/common";
import { ErrorsModule } from "./errors/errors.module";

@Module({
  imports: [ErrorsModule],
})
export class AppModule {}

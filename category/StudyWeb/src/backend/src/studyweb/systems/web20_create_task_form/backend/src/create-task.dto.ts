import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: "title must contain a non-whitespace character" })
  @MaxLength(100)
  title!: string;
}

import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ErrorsService } from "./errors.service";

@Controller("status")
export class ErrorsController {
  constructor(private readonly errorsService: ErrorsService) {}

  @Get("ok")
  ok() {
    return this.errorsService.buildOk();
  }

  @Get("bad-request")
  badRequest() {
    throw new BadRequestException("bad_request_sample");
  }

  @Get("not-found")
  notFound() {
    throw new NotFoundException("not_found_sample");
  }

  @Get("server-error")
  serverError() {
    throw new InternalServerErrorException("server_error_sample");
  }
}

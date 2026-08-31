import { BadRequestException, Controller, Get, InternalServerErrorException, NotFoundException } from "@nestjs/common";

@Controller("debug")
export class DebugController {
  @Get("success")
  success() {
    return { statusCode: 200, message: "success", details: { source: "web21" } };
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

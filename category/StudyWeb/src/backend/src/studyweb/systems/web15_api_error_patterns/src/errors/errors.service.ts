import { Injectable } from "@nestjs/common";

@Injectable()
export class ErrorsService {
  buildOk() {
    return {
      statusCode: 200,
      message: "OK response",
    };
  }
}

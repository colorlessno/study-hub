import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHello() {
    return {
      message: "Hello from NestJS",
      sample: "web13_nest_hello_api",
      timestamp: new Date().toISOString(),
    };
  }
}

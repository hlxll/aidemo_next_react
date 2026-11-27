import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";


@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    console.log("内存使用情况", process.memoryUsage())
    response.status(200).json({
      code: 200,
      message: exception.message,
    });
  }
}

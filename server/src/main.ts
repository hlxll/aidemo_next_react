import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule, ObserveInstrument } from './app.module.js';
import { HttpExceptionFilter } from './app.filter.js';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  // 使用原生 ws 适配器（前端是裸 WebSocket，不是 socket.io）
  app.useWebSocketAdapter(new WsAdapter(app));
  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());
  //允许跨域请求
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();

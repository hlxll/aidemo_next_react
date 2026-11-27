import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController, AudioStreamGateway } from './app.controller.js';
import { AppService } from './app.service.js';
import {HttpModule} from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module.js';
export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'app.sqlite',
      // 自动把各个 forFeature 注册的实体纳入连接（ESM 下别用 entities 通配符路径）
      autoLoadEntities: true,
      // 仅开发环境：自动建表/改表，生产必须关掉改用 migration
      synchronize: true,
    }),
    UserModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    // ObserveModule.forRoot({
    //   appKey: 'YOUR_APP_KEY',
    //   appSecret: 'YOUR_APP_SECRET',
    //   serviceId: 'server',
    // }),
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AudioStreamGateway],
})
export class AppModule {}

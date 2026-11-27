import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity.js';
import { UserController } from './user.controller.js';

@Module({
  // forFeature 把 User 的 Repository 注册到本模块的容器里，供 @InjectRepository 注入
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
})
export class UserModule {}

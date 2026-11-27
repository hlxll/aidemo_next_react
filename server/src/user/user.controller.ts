import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity.js';

/** 最小用法：注入 Repository，用它的方法读写表 */
@Controller('user')
export class UserController {
  /** Logger 不需要注入，直接当字段初始化 */
  private readonly logger = new Logger(UserController.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** 新增：create 只造对象，save 才落库 */
  @Post()
  create(@Body() body: { name: string; email: string }) {
    this.logger.log(body);
    const user = this.userRepo.create(body);
    return this.userRepo.save(user);
  }

  /** 查询列表 */
  @Get()
  list() {
    return this.userRepo.find({ order: { id: 'DESC' } });
  }

  /** 条件查询单条 */
  @Get(':email')
  findByEmail(@Param('email') email: string) {
    return this.userRepo.findOneBy({ email });
  }
}

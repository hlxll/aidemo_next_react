import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** 一张表 = 一个实体类；@Entity('users') 指定表名 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

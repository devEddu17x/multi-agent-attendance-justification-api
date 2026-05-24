import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { TeacherCourseEntity } from './teacher-course.entity';

@Entity('teachers')
export class TeacherEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_number', type: 'varchar', unique: true, length: 8 })
  documentNumber: string;

  @Column({ type: 'varchar', length: 9 })
  phone: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => UserEntity, (user) => user.teacher)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @OneToMany(() => TeacherCourseEntity, (tct) => tct.teacher)
  teacherCourses: TeacherCourseEntity[];
}

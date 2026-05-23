import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { TeacherEntity } from './teacher.entity';
import { CourseEntity } from '../../courses/entities/course.entity';

@Entity('teacher_courses')
export class TeacherCourseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => TeacherEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: TeacherEntity;

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;
}

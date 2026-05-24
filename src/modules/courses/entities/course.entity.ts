import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { TeacherCourseEntity } from '../../teachers/entities/teacher-course.entity';

@Entity('courses')
export class CourseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', unique: true, length: 100 })
  code: string;

  @OneToMany(() => TeacherCourseEntity, (tct) => tct.course)
  teacherCourses: TeacherCourseEntity[];
}

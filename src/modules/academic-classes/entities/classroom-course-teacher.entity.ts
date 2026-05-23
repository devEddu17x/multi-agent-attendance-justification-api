import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AcademicYearEntity } from './academic-year.entity';
import { CourseEntity } from '../../courses/entities/course.entity';
import { ClassroomEntity } from '../../classroom/entities/classroom.entity';
import { TeacherEntity } from '../../teachers/entities/teacher.entity';

@Entity('classroom_course_teacher')
export class ClassroomCourseTeacherEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'academic_year_id', type: 'uuid' })
  academicYearId: string;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @Column({ name: 'classroom_id', type: 'uuid' })
  classroomId: string;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @ManyToOne(() => AcademicYearEntity)
  @JoinColumn({ name: 'academic_year_id' })
  academicYear: AcademicYearEntity;

  @ManyToOne(() => CourseEntity)
  @JoinColumn({ name: 'course_id' })
  course: CourseEntity;

  @ManyToOne(() => ClassroomEntity)
  @JoinColumn({ name: 'classroom_id' })
  classroom: ClassroomEntity;

  @ManyToOne(() => TeacherEntity)
  @JoinColumn({ name: 'teacher_id' })
  teacher: TeacherEntity;
}

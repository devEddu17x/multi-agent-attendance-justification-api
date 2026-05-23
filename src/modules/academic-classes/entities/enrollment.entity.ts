import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StudentEntity } from '../../students/entities/student.entity';
import { ClassroomCourseTeacherEntity } from './classroom-course-teacher.entity';

@Entity('enrollments')
export class EnrollmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'classroom_course_teacher_id', type: 'uuid' })
  classroomCourseTeacherId: string;

  @ManyToOne(() => StudentEntity)
  @JoinColumn({ name: 'student_id' })
  student: StudentEntity;

  @ManyToOne(() => ClassroomCourseTeacherEntity)
  @JoinColumn({ name: 'classroom_course_teacher_id' })
  classroomCourseTeacher: ClassroomCourseTeacherEntity;
}

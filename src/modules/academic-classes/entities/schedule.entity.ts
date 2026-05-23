import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ClassroomCourseTeacherEntity } from './classroom-course-teacher.entity';
import { DayOfWeek } from '../../../common/enums/day-of-week.enum';

@Entity('schedules')
export class ScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'classroom_course_teacher_id', type: 'uuid' })
  classroomCourseTeacherId: string;

  @Column({ name: 'day_of_week', type: 'enum', enum: DayOfWeek })
  dayOfWeek: DayOfWeek;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @ManyToOne(() => ClassroomCourseTeacherEntity)
  @JoinColumn({ name: 'classroom_course_teacher_id' })
  classroomCourseTeacher: ClassroomCourseTeacherEntity;
}

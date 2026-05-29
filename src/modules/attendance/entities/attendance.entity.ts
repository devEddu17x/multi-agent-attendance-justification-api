import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { StudentEntity } from '../../students/entities/student.entity';
import { ScheduleEntity } from '../../academic-classes/entities/schedule.entity';
import { AttendanceStatus } from '../enums/attendance-status.enum';

@Entity('attendance')
@Unique(['studentId', 'scheduleId', 'date'])
export class AttendanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'schedule_id', type: 'uuid', nullable: true })
  scheduleId: string | null;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'check_in_time', type: 'time', nullable: true })
  checkInTime: string;

  @Column({ type: 'enum', enum: AttendanceStatus })
  status: AttendanceStatus;

  @Column({
    name: 'confidence_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  confidenceScore: number;

  @ManyToOne(() => StudentEntity)
  @JoinColumn({ name: 'student_id' })
  student: StudentEntity;

  @ManyToOne(() => ScheduleEntity)
  @JoinColumn({ name: 'schedule_id' })
  schedule: ScheduleEntity;
}

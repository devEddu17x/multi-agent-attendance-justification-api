import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AttendanceEntity } from './attendance.entity';
import { ParentEntity } from '../../parents/entities/parent.entity';
import { JustificationStatus } from '../enums/justification-status.enum';

@Entity('attendance_justifications')
export class AttendanceJustificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'attendance_id', type: 'uuid' })
  attendanceId: string;

  @Column({ name: 'parent_id', type: 'uuid' })
  parentId: string;

  @Column({ name: 'request_date', type: 'timestamp' })
  requestDate: Date;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'evidence_url', type: 'varchar' })
  evidenceUrl: string;

  @Column({
    type: 'enum',
    enum: JustificationStatus,
    default: JustificationStatus.PENDING_REVIEW,
  })
  status: JustificationStatus;

  @Column({ name: 'ai_metadata', type: 'jsonb' })
  aiMetadata: any;

  @ManyToOne(() => AttendanceEntity)
  @JoinColumn({ name: 'attendance_id' })
  attendance: AttendanceEntity;

  @ManyToOne(() => ParentEntity)
  @JoinColumn({ name: 'parent_id' })
  parent: ParentEntity;
}

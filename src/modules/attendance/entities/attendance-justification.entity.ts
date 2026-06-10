import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ParentEntity } from '../../parents/entities/parent.entity';
import { JustificationStatus } from '../enums/justification-status.enum';

@Entity('attendance_justifications')
export class AttendanceJustificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'parent_id', type: 'uuid' })
  parentId: string;

  @Column({ name: 'request_date', type: 'timestamp' })
  requestDate: Date;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'evidences', type: 'jsonb', nullable: true })
  evidences: { key: string; type: string; name: string }[] | null;

  @Column({
    type: 'enum',
    enum: JustificationStatus,
    default: JustificationStatus.PENDING_REVIEW,
  })
  status: JustificationStatus;

  @Column({ name: 'ai_metadata', type: 'jsonb' })
  aiMetadata: { verdict: string; reason: string };

  @ManyToOne(() => ParentEntity)
  @JoinColumn({ name: 'parent_id' })
  parent: ParentEntity;
}

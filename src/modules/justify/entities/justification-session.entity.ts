import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StudentEntity } from '../../students/entities/student.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { SessionStatus } from '../enums/session-status.enum';

@Entity('justification_sessions')
export class JustificationSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid', nullable: true })
  studentId: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  status: SessionStatus;

  @Column({ name: 'required_documents', type: 'simple-array', nullable: true })
  requiredDocuments: string[] | null;

  @Column({ name: 'applied_article', type: 'varchar', nullable: true })
  appliedArticle: string | null;

  @Column({ name: 'final_verdict', type: 'jsonb', nullable: true })
  finalVerdict: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => StudentEntity, { nullable: true })
  @JoinColumn({ name: 'student_id' })
  student: StudentEntity | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}

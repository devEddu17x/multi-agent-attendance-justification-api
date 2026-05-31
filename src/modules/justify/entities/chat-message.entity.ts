import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { JustificationSessionEntity } from './justification-session.entity';
import { ChatMessageRole } from '../enums/chat-message-role.enum';

@Entity('chat_messages')
export class ChatMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({
    type: 'enum',
    enum: ChatMessageRole,
  })
  role: ChatMessageRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-json', nullable: true })
  attachments: string[] | null;

  @Column({ name: 'tool_calls', type: 'jsonb', nullable: true })
  toolCalls: Record<string, unknown>[] | null;

  @Column({ name: 'tool_outputs', type: 'jsonb', nullable: true })
  toolOutputs: Record<string, unknown>[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => JustificationSessionEntity, (session) => session.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: JustificationSessionEntity;
}

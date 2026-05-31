import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JustificationSessionEntity } from '../entities/justification-session.entity';
import { ChatMessageEntity } from '../entities/chat-message.entity';
import { SessionStatus } from '../enums/session-status.enum';
import { ChatMessageRole } from '../enums/chat-message-role.enum';
import { ChatMessageDTO } from '../dto/chat-message.dto';

export interface SessionResult {
  id: string;
  status: SessionStatus;
  isNew: boolean;
}

@Injectable()
export class SessionManagerService {
  constructor(
    @InjectRepository(JustificationSessionEntity)
    private readonly sessionRepo: Repository<JustificationSessionEntity>,
    @InjectRepository(ChatMessageEntity)
    private readonly messageRepo: Repository<ChatMessageEntity>,
  ) {}

  async getOrCreateSession(
    dto: ChatMessageDTO,
    userId: string,
  ): Promise<SessionResult> {
    if (dto.sessionId) {
      const session = await this.sessionRepo.findOne({
        where: { id: dto.sessionId, userId },
      });
      if (!session) {
        throw new NotFoundException('Session not found');
      }
      return { id: session.id, status: session.status, isNew: false };
    }

    const session = await this.sessionRepo.save({
      userId,
      studentId: dto.studentId || null,
      status: SessionStatus.ACTIVE,
    });

    return { id: session.id, status: session.status, isNew: true };
  }

  async saveUserMessage(sessionId: string, dto: ChatMessageDTO): Promise<void> {
    await this.messageRepo.save({
      sessionId,
      role: ChatMessageRole.USER,
      content: dto.content,
      attachments: dto.attachments || null,
    });
  }

  async saveAssistantMessage(
    sessionId: string,
    content: string,
  ): Promise<void> {
    await this.messageRepo.save({
      sessionId,
      role: ChatMessageRole.ASSISTANT,
      content,
    });
  }

  async getSessionMessages(sessionId: string): Promise<ChatMessageEntity[]> {
    return this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }
}

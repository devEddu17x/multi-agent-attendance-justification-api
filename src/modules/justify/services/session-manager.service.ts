import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JustificationSessionEntity } from '../entities/justification-session.entity';
import { ChatMessageEntity } from '../entities/chat-message.entity';
import { SessionStatus } from '../enums/session-status.enum';
import { ChatMessageRole } from '../enums/chat-message-role.enum';
import { ChatMessageDTO } from '../dto/chat-message.dto';
import { SessionResult } from '../interfaces/session-result.interface';

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
      return {
        id: session.id,
        status: session.status,
        isNew: false,
        extractedData: session.extractedData ?? undefined,
        historyOutput: session.historyOutput ?? undefined,
        regulationsOutput: session.regulationsOutput ?? undefined,
        finalVerdict: session.finalVerdict ?? undefined,
      };
    }

    const session = await this.sessionRepo.save({
      userId,
      studentId: dto.studentId || null,
      status: SessionStatus.ACTIVE,
    });

    return { id: session.id, status: session.status, isNew: true };
  }

  async saveSessionOutputs(
    sessionId: string,
    outputs: {
      extractedData?: Record<string, unknown>;
      historyOutput?: Record<string, unknown>;
      regulationsOutput?: Record<string, unknown>;
      finalVerdict?: Record<string, unknown>;
    },
  ): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (outputs.extractedData) {
      session.extractedData = outputs.extractedData;
    }
    if (outputs.historyOutput) {
      session.historyOutput = outputs.historyOutput;
    }
    if (outputs.regulationsOutput) {
      session.regulationsOutput = outputs.regulationsOutput;
    }
    if (outputs.finalVerdict) {
      session.finalVerdict = outputs.finalVerdict;
    }

    await this.sessionRepo.save(session);
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

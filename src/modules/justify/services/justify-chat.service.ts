import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ChatMessageDTO } from '../dto/chat-message.dto';
import { SessionManagerService } from './session-manager.service';
import { StateBuilderService } from './state-builder.service';
import { AttachmentProcessorService } from './attachment-processor.service';
import { SseEventService } from './sse-event.service';
import { GraphService } from '../../../agents/services/graph.service';
import { StudentsService } from 'src/modules/students/students.service';
import { User } from 'src/common/interfaces/user.interface';
import { SessionStatus } from '../enums/session-status.enum';

@Injectable()
export class JustifyChatService {
  private readonly logger = new Logger(JustifyChatService.name);

  constructor(
    private readonly sessionManager: SessionManagerService,
    private readonly stateBuilder: StateBuilderService,
    private readonly attachmentProcessor: AttachmentProcessorService,
    private readonly graphService: GraphService,
    private readonly studentService: StudentsService,
    private readonly sse: SseEventService,
  ) {}

  async handleChat(dto: ChatMessageDTO, res: Response, user: User) {
    this.logger.log(
      `[CHAT] Handling chat for studentId=${dto.studentId}, sessionId=${dto.sessionId}`,
    );

    const students = await this.studentService.getStudentsByParentEmail(
      user.email,
    );
    if (
      students.length === 0 ||
      !students.some((s) => s.id === dto.studentId)
    ) {
      this.sse.emitError(
        res,
        'Estudiante seleccionado no encontrado o no asociado a tu cuenta.',
      );
      return;
    }
    const session = await this.sessionManager.getOrCreateSession(dto, user.sub);
    this.logger.log(
      `[CHAT] Session: id=${session.id}, isNew=${session.isNew}, status=${session.status}`,
    );

    if (session.isNew) {
      this.sse.emitStatus(res, 'session_created', { sessionId: session.id });
    }

    await this.sessionManager.saveUserMessage(session.id, dto);

    const dbMessages = await this.sessionManager.getSessionMessages(session.id);
    const langChainMessages = this.stateBuilder.toLangChainMessages(dbMessages);

    const blocks = dto.attachments?.length
      ? await this.attachmentProcessor.process(dto.attachments)
      : [];

    this.sse.emitStatus(res, 'processing', {
      message: 'Analizando solicitud...',
    });

    const state = this.stateBuilder.buildAgentState(
      langChainMessages,
      session,
      user.sub,
      blocks,
      dto.studentId,
    );
    this.logger.log(
      `[CHAT] AgentState built: studentId=${state.studentId}, attachments=${state.attachments?.length || 0}, extractedData=${JSON.stringify(state.extractedData)}`,
    );

    const result = await this.graphService.invoke(state);
    this.logger.log(
      `[CHAT] Graph result: finalVerdict=${JSON.stringify(result.finalVerdict)}, finalResponse=${result.finalResponse?.substring(0, 100)}...`,
    );

    const content =
      result.finalResponse ?? 'Lo siento, no pude procesar tu solicitud.';

    await this.sessionManager.saveAssistantMessage(session.id, content);

    // Persist agent outputs for the next conversation turn
    await this.sessionManager.saveSessionOutputs(session.id, {
      extractedData: result.extractedData,
      historyOutput: result.historyOutput,
      regulationsOutput: result.regulationsOutput,
      finalVerdict: result.finalVerdict,
    });
    this.logger.log(
      `[CHAT] Session outputs saved: extractedData=${!!result.extractedData}, historyOutput=${!!result.historyOutput}, regulationsOutput=${!!result.regulationsOutput}, finalVerdict=${!!result.finalVerdict}`,
    );

    this.sse.emitMessage(res, content, session.id);

    // Use the updated session status from the transactional agent if available
    const finalStatus = (
      result.finalVerdict as Record<string, unknown> | undefined
    )?.sessionStatus;
    const resolvedStatus =
      typeof finalStatus === 'string' &&
      Object.values(SessionStatus).includes(finalStatus as SessionStatus)
        ? (finalStatus as SessionStatus)
        : session.status;

    this.sse.emitDone(res, session.id, resolvedStatus);
    this.logger.log(`[CHAT] Chat completed. Final status: ${resolvedStatus}`);
  }
}

import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { ChatMessageDTO } from '../dto/chat-message.dto';
import { SessionManagerService } from './session-manager.service';
import { MessageMapperService } from './message-mapper.service';
import { AttachmentProcessorService } from './attachment-processor.service';
import { AgentStateBuilderService } from './agent-state-builder.service';
import { SseEventService } from './sse-event.service';
import { GraphService } from '../../../agents/services/graph.service';
import { AgentState } from '../../../agents/interfaces/agent-state.interface';

@Injectable()
export class JustifyChatService {
  constructor(
    private readonly sessionManager: SessionManagerService,
    private readonly messageMapper: MessageMapperService,
    private readonly attachmentProcessor: AttachmentProcessorService,
    private readonly agentStateBuilder: AgentStateBuilderService,
    private readonly graphService: GraphService,
    private readonly sse: SseEventService,
  ) {}

  async handleChat(dto: ChatMessageDTO, res: Response, userId: string) {
    const session = await this.sessionManager.getOrCreateSession(dto, userId);
    if (session.isNew) {
      this.sse.emitStatus(res, 'session_created', { sessionId: session.id });
    }

    await this.sessionManager.saveUserMessage(session.id, dto);

    const dbMessages = await this.sessionManager.getSessionMessages(session.id);
    const langChainMessages =
      this.messageMapper.toLangChainMessages(dbMessages);

    const blocks = dto.attachments?.length
      ? await this.attachmentProcessor.process(dto.attachments)
      : [];

    // We do not append the multimodal blocks to langChainMessages anymore
    // to avoid sending large base64 image payloads in subsequent LLM agent calls.
    // The extractor agent will consume them directly from state.attachments.
    //
    // if (blocks.length) {
    //   this.messageMapper.appendMultimodal(
    //     langChainMessages,
    //     dto.content,
    //     blocks,
    //   );
    // }

    this.sse.emitStatus(res, 'processing', {
      message: 'Analizando solicitud...',
    });

    const state = this.agentStateBuilder.build(
      langChainMessages,
      session,
      userId,
      blocks,
      dto.studentId,
    );

    const result = (await this.graphService.invoke(
      state as any,
    )) as Partial<AgentState>;

    const content =
      result.finalResponse ?? 'Lo siento, no pude procesar tu solicitud.';
    await this.sessionManager.saveAssistantMessage(session.id, content);

    this.sse.emitMessage(res, content, session.id);
    this.sse.emitDone(res, session.id, session.status);
  }
}

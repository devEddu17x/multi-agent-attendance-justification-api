import { Injectable } from '@nestjs/common';
import { BaseMessage } from '@langchain/core/messages';
import {
  AgentState,
  AnthropicContentBlock,
} from '../../../agents/interfaces/agent-state.interface';
import { SessionResult } from '../interfaces/session-result.interface';

@Injectable()
export class AgentStateBuilderService {
  build(
    messages: BaseMessage[],
    session: SessionResult,
    userId: string,
    blocks: AnthropicContentBlock[],
    studentId?: string,
  ): AgentState {
    return {
      messages,
      sessionId: session.id,
      userId,
      studentId,
      attachments: blocks.length > 0 ? blocks : undefined,
    };
  }
}

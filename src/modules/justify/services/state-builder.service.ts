import { Injectable } from '@nestjs/common';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { ChatMessageEntity } from '../entities/chat-message.entity';
import { ChatMessageRole } from '../enums/chat-message-role.enum';
import { AgentState } from '../../../agents/interfaces/agent-state.interface';
import { AnthropicContentBlock } from '../../../agents/interfaces/anthropic-content-block.interface';
import { SessionResult } from '../interfaces/session-result.interface';

@Injectable()
export class StateBuilderService {
  /**
   * Maps chat messages from DB entities to LangChain BaseMessage[] format.
   */
  toLangChainMessages(entities: ChatMessageEntity[]): BaseMessage[] {
    return entities.map((m) => {
      if (m.role === ChatMessageRole.USER) {
        return new HumanMessage(m.content);
      }
      return new AIMessage(m.content);
    });
  }

  /**
   * Builds the initial AgentState for the graph, injecting persisted outputs
   * from previous conversation turns so the orchestrator can decide idempotently.
   */
  buildAgentState(
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
      extractedData: undefined,
      historyOutput: session.historyOutput,
      regulationsOutput: undefined,
      finalVerdict: undefined,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import {
  BaseMessage,
  SystemMessage,
  HumanMessage,
} from '@langchain/core/messages';
import { LlmService } from './llm.service';
import { AgentState } from '../interfaces/agent-state.interface';
import { ORCHESTRATOR_SYSTEM_PROMPT } from '../prompts/orchestrator-system.prompt';

@Injectable()
export class OrchestratorAgentService {
  private readonly logger = new Logger(OrchestratorAgentService.name);

  constructor(private readonly llmService: LlmService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    const model = this.llmService.getModel();

    const lastUserMessage = this.getLastUserMessageText(state);

    const messages = [
      new SystemMessage(ORCHESTRATOR_SYSTEM_PROMPT),
      new HumanMessage(lastUserMessage || 'Hola'),
    ];

    try {
      const response = await model.invoke(messages);
      const raw = (response.content as string).trim();
      const decision = JSON.parse(raw) as { nextAgent: string };

      const validAgents = ['communicator', 'extractor', 'transactional'];
      const nextAgent = validAgents.includes(decision.nextAgent)
        ? decision.nextAgent
        : 'communicator';

      return { nextAgent };
    } catch (error) {
      this.logger.warn(
        'Orchestrator failed to parse LLM response, defaulting to communicator',
        error,
      );
      return { nextAgent: 'communicator' };
    }
  }

  private getLastUserMessageText(state: AgentState): string {
    type MessageWithType = BaseMessage & {
      _getType?: () => string;
      content?: unknown;
    };

    const messages = state.messages ?? [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i] as MessageWithType;
      if (!msg || typeof msg !== 'object') continue;

      const role = typeof msg._getType === 'function' ? msg._getType() : '';
      if (role !== 'human') continue;

      const content = msg.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content
          .map((block) => {
            if (
              typeof block === 'object' &&
              block !== null &&
              'type' in block &&
              (block as { type?: string }).type === 'text'
            ) {
              return (block as { text?: string }).text ?? '';
            }
            return '';
          })
          .filter(Boolean)
          .join(' ');
      }
    }
    return '';
  }
}

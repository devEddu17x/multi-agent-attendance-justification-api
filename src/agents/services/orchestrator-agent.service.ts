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
    // Hybrid routing: if attachments are present, always go to extractor first.
    // The extractor → history → regulations → communicator chain handles the rest.
    if (state.attachments && state.attachments.length > 0) {
      this.logger.debug('Attachments detected, routing to extractor');
      return { nextAgent: 'extractor' };
    }

    // No attachments: ask the LLM to decide based on the message content
    try {
      const nextAgent = await this.decideWithLlm(state);
      this.logger.debug(`LLM routing decision: ${nextAgent}`);
      return { nextAgent };
    } catch (err) {
      this.logger.error(
        'Orchestrator LLM call failed, defaulting to communicator',
        err,
      );
      return { nextAgent: 'communicator' };
    }
  }

  private async decideWithLlm(state: AgentState): Promise<string> {
    const model = this.llmService.getModel();

    const lastUserMessage = this.getLastUserMessageText(state);

    const messages = [
      new SystemMessage(ORCHESTRATOR_SYSTEM_PROMPT),
      new HumanMessage(lastUserMessage || 'Hola'),
    ];

    try {
      const response = await model.invoke(messages);
      const raw = (response.content as string).trim();
      const clean = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const decision = JSON.parse(clean) as { nextAgent: string };

      const validAgents = ['history', 'communicator', 'transactional'];
      const nextAgent = validAgents.includes(decision.nextAgent)
        ? decision.nextAgent
        : 'communicator';

      return nextAgent;
    } catch (error) {
      this.logger.warn(
        'Orchestrator failed to parse LLM response, defaulting to communicator',
        error,
      );
      return 'communicator';
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

import { Injectable } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AgentState } from '../interfaces/agent-state.interface';
import { COMMUNICATOR_SYSTEM_PROMPT } from '../prompts/communicator-system.prompt';
import { SystemMessage } from '@langchain/core/messages';

@Injectable()
export class CommunicatorAgentService {
  constructor(private readonly llmService: LlmService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    const model = this.llmService.getModel();

    const messages = [
      new SystemMessage(COMMUNICATOR_SYSTEM_PROMPT),
      ...state.messages,
    ];

    const response = await model.invoke(messages);
    const content = response.content as string;

    return {
      finalResponse: content,
      nextAgent: 'end',
    };
  }
}

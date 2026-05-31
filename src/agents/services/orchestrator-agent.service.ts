import { Injectable } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AgentState } from '../interfaces/agent-state.interface';
import { ORCHESTRATOR_SYSTEM_PROMPT } from '../prompts/orchestrator-system.prompt';
import { SystemMessage } from '@langchain/core/messages';

@Injectable()
export class OrchestratorAgentService {
  constructor(private readonly llmService: LlmService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    const model = this.llmService.getModel();

    const messages = [
      new SystemMessage(ORCHESTRATOR_SYSTEM_PROMPT),
      ...state.messages,
    ];

    // Demo: always route to communicator to keep a functional flow
    // TODO: implement real routing logic with the LLM
    // const response = await model.invoke(messages);
    // const content = response.content as string;
    // const decision = JSON.parse(content);

    return {
      nextAgent: 'communicator',
    };
  }
}

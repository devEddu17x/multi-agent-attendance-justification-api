import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AgentState } from '../interfaces/agent-state.interface';
import { ORCHESTRATOR_SYSTEM_PROMPT } from '../prompts/orchestrator-system.prompt';
import { SystemMessage } from '@langchain/core/messages';

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

    const messages = [
      new SystemMessage(ORCHESTRATOR_SYSTEM_PROMPT),
      // Only pass the last user message to keep the prompt focused
      ...state.messages,
    ];

    const response = await model.invoke(messages);
    const content = (response.content as string).trim();

    const parsed = this.parseDecision(content);
    const allowed = ['history', 'communicator', 'transactional'];

    if (allowed.includes(parsed.nextAgent)) {
      return parsed.nextAgent;
    }

    this.logger.warn(
      `Unexpected nextAgent "${parsed.nextAgent}", defaulting to communicator`,
    );
    return 'communicator';
  }

  private parseDecision(raw: string): { nextAgent: string } {
    try {
      const clean = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      return JSON.parse(clean) as { nextAgent: string };
    } catch {
      this.logger.warn(
        'Could not parse orchestrator JSON, defaulting to communicator',
        raw,
      );
      return { nextAgent: 'communicator' };
    }
  }
}

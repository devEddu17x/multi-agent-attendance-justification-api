import { Injectable, Logger } from '@nestjs/common';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { LlmService } from './llm.service';
import { AgentState } from '../interfaces/agent-state.interface';
import { ORCHESTRATOR_SYSTEM_PROMPT } from '../prompts/orchestrator-system.prompt';

@Injectable()
export class OrchestratorAgentService {
  private readonly logger = new Logger(OrchestratorAgentService.name);

  constructor(private readonly llmService: LlmService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(`[ORCHESTRATOR] Executing for session=${state.sessionId}`);

    // Deterministic routing: override LLM when state is clear
    const hasExtractedData =
      state.extractedData && Object.keys(state.extractedData).length > 0;
    const hasHistoryOutput = state.historyOutput?.available === true;
    const hasRegulationsOutput = state.regulationsOutput?.available === true;
    const hasFinalVerdict = state.finalVerdict?.available === true;
    const hasAttachments = (state.attachments?.length ?? 0) > 0;

    this.logger.log(
      `[ORCHESTRATOR] State check: hasExtractedData=${hasExtractedData}, hasHistoryOutput=${hasHistoryOutput}, hasRegulationsOutput=${hasRegulationsOutput}, hasFinalVerdict=${hasFinalVerdict}, hasAttachments=${hasAttachments}`,
    );

    // Force transactional if regulations done but no verdict yet
    if (hasRegulationsOutput && !hasFinalVerdict) {
      this.logger.log('[ORCHESTRATOR] Forcing route to: transactional');
      return { nextAgent: 'transactional' };
    }

    // Force communicator if verdict already exists
    // Note: attachments are just inputs that were already processed by the extractor
    // If there are new attachments in a future message, StateBuilder will clear finalVerdict
    if (hasFinalVerdict) {
      this.logger.log('[ORCHESTRATOR] Forcing route to: communicator');
      return { nextAgent: 'communicator' };
    }

    // Force extractor if there are new attachments not yet processed
    if (hasAttachments && !hasExtractedData) {
      this.logger.log(
        '[ORCHESTRATOR] Forcing route to: extractor (new attachments)',
      );
      return { nextAgent: 'extractor' };
    }

    // Force extractor if no extracted data yet (text only)
    if (!hasExtractedData) {
      this.logger.log('[ORCHESTRATOR] Forcing route to: extractor');
      return { nextAgent: 'extractor' };
    }

    // Force regulations if extracted and history done, but regulations not
    if (hasExtractedData && hasHistoryOutput && !hasRegulationsOutput) {
      this.logger.log(
        '[ORCHESTRATOR] Forcing route to: regulations (extracted + history done)',
      );
      return { nextAgent: 'regulations' };
    }

    // If extractor failed with parse error and already retried, skip to history
    const hasParseError = state.extractedData?.error === 'parse_failed';
    const retryCount = (state.extractedData?.retryCount || 0) as number;
    if (hasParseError && retryCount >= 1) {
      this.logger.log(
        '[ORCHESTRATOR] Extractor failed with parse error, skipping to history',
      );
      return { nextAgent: 'history' };
    }

    // Use LLM only for ambiguous cases
    const model = this.llmService.getModel();
    const lastMessage =
      [...(state.messages ?? [])].reverse().find((m) => m.type === 'human')
        ?.content ?? '';

    const response = await model.invoke([
      new SystemMessage(ORCHESTRATOR_SYSTEM_PROMPT),
      new HumanMessage(
        JSON.stringify({
          message: lastMessage,
          hasAttachments,
          hasExtractedData,
          hasHistoryOutput,
          hasRegulationsOutput,
          hasFinalVerdict,
        }),
      ),
    ]);

    const clean = (response.content as string)
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const { nextAgent } = JSON.parse(clean);

    const valid = [
      'extractor',
      'history',
      'regulations',
      'transactional',
      'communicator',
    ];
    this.logger.log(`[ORCHESTRATOR] LLM route: ${nextAgent}`);
    return {
      nextAgent: valid.includes(nextAgent) ? nextAgent : 'communicator',
    };
  }
}

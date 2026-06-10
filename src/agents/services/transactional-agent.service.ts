import { Injectable, Logger } from '@nestjs/common';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../interfaces/agent-state.interface';
import { LlmService } from './llm.service';
import { JustificationService } from '../../modules/justify/services/justification.service';
import { TRANSACTIONAL_SYSTEM_PROMPT } from '../prompts/transactional-system.prompt';

interface TransactionalDecision {
  verdict: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
  reason: string;
  missingDocuments: string[];
  appliedArticle: string | null;
  sessionStatus: 'completed' | 'awaiting_documents' | 'cancelled';
}

@Injectable()
export class TransactionalAgentService {
  private readonly logger = new Logger(TransactionalAgentService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly justificationService: JustificationService,
  ) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(
      `[TRANSACTIONAL] Starting execution for session=${state.sessionId}`,
    );
    this.logger.log(
      `[TRANSACTIONAL] State: extractedData=${JSON.stringify(state.extractedData)}, regulationsOutput=${JSON.stringify(state.regulationsOutput)}`,
    );

    const decision = await this.decide(state);
    this.logger.log(`[TRANSACTIONAL] Decision: ${JSON.stringify(decision)}`);

    try {
      await this.justificationService.persist(state, decision);
      this.logger.log('[TRANSACTIONAL] persist() completed successfully');
    } catch (error) {
      this.logger.error(`[TRANSACTIONAL] persist() failed: ${error}`);
      throw error;
    }

    return {
      finalVerdict: {
        available: true,
        verdict: decision.verdict,
        reason: decision.reason,
        appliedArticle: decision.appliedArticle,
        missingDocuments: decision.missingDocuments,
        sessionStatus: decision.sessionStatus,
      },
    };
  }

  private async decide(state: AgentState): Promise<TransactionalDecision> {
    const model = this.llmService.getModel();

    const response = await model.invoke([
      new SystemMessage(TRANSACTIONAL_SYSTEM_PROMPT),
      new HumanMessage(
        JSON.stringify(
          {
            extractedData: state.extractedData,
            historyOutput: state.historyOutput,
            regulationsOutput: state.regulationsOutput,
          },
          null,
          2,
        ),
      ),
    ]);

    return JSON.parse(response.content as string) as TransactionalDecision;
  }
}

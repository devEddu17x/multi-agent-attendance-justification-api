import { BaseMessage } from '@langchain/core/messages';
import { AnthropicContentBlock } from './anthropic-content-block.interface';
import {
  ExtractedEvidence,
  PolicyEvaluation,
  TransactionalDecision,
} from './justification-workflow.interface';

export interface AgentState {
  messages: BaseMessage[];
  sessionId: string;
  userId: string;
  studentId: string | undefined;
  attachments?: AnthropicContentBlock[];
  nextAgent?: string;
  extractedData?: ExtractedEvidence | Record<string, unknown>;
  historyOutput?: Record<string, unknown>;
  regulationsOutput?: PolicyEvaluation | Record<string, unknown>;
  finalVerdict?:
    | (TransactionalDecision & { available?: boolean })
    | Record<string, unknown>;
  finalResponse?: string;
}

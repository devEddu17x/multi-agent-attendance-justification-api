import { BaseMessage } from '@langchain/core/messages';
import { AnthropicContentBlock } from './anthropic-content-block.interface';

export interface AgentState {
  messages: BaseMessage[];
  sessionId: string;
  userId: string;
  studentId: string | undefined;
  attachments?: AnthropicContentBlock[];
  nextAgent?: string;
  extractedData?: Record<string, unknown>;
  historyOutput?: Record<string, unknown>;
  regulationsOutput?: Record<string, unknown>;
  finalVerdict?: Record<string, unknown>;
  finalResponse?: string;
}

import { BaseMessage } from '@langchain/core/messages';

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
  finalResponse?: string;
}

export interface AnthropicContentBlock {
  type: 'text' | 'image' | 'document';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AgentState } from '../interfaces/agent-state.interface';
import { AnthropicContentBlock } from '../interfaces/anthropic-content-block.interface';
import { EXTRACTOR_SYSTEM_PROMPT } from '../prompts/extractor-system.prompt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class ExtractorAgentService {
  private readonly logger = new Logger(ExtractorAgentService.name);

  constructor(private readonly llmService: LlmService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const text = typeof lastMessage?.content === 'string' ? lastMessage.content : '';
    this.logger.log(`[EXTRACTOR] Processing message: "${text.substring(0, 100)}...", attachments=${state.attachments?.length || 0}`);

    let extracted: Record<string, unknown>;
    if (state.attachments?.length) {
      extracted = await this.extractFromAttachments(state.attachments, text);
    } else {
      // Even without attachments, extract intent from text
      extracted = await this.extractFromText(text);
    }
    
    // Track retry count to prevent infinite loops
    if (extracted.error === 'parse_failed') {
      const currentRetry = (state.extractedData?.retryCount || 0) as number;
      extracted.retryCount = currentRetry + 1;
      this.logger.warn(`[EXTRACTOR] Parse failed. Retry count: ${extracted.retryCount}`);
    }
    
    this.logger.log(`[EXTRACTOR] Extracted data: ${JSON.stringify(extracted)}`);
    return { extractedData: extracted };
  }

  private async extractFromAttachments(
    attachments: AnthropicContentBlock[],
    text: string,
  ): Promise<Record<string, unknown>> {
    const model = this.llmService.getModel();

    const messages = [
      new SystemMessage(EXTRACTOR_SYSTEM_PROMPT),
      new HumanMessage({
        content: [
          {
            type: 'text',
            text: `Mensaje del padre: "${text}"\n\nAnaliza el/los siguiente(s) documento(s) adjunto(s) y extrae la información solicitada.`,
          },
          ...(attachments as any[]),
        ],
      }),
    ];

    const response = await model.invoke(messages);
    return this.parseJson(response.content as string);
  }

  private async extractFromText(
    text: string,
  ): Promise<Record<string, unknown>> {
    const model = this.llmService.getModel();

    const messages = [
      new SystemMessage(EXTRACTOR_SYSTEM_PROMPT),
      new HumanMessage({
        content: `Mensaje del padre: "${text}"\n\nExtrae la información solicitada del mensaje del padre. Si no hay fechas específicas, infiere el número de días del mensaje (ej. "faltó 1 día" → numDias: 1).`,
      }),
    ];

    const response = await model.invoke(messages);
    return this.parseJson(response.content as string);
  }

  private parseJson(raw: unknown): Record<string, unknown> {
    try {
      let content: string;

      // Handle array of blocks (Anthropic thinking + text)
      if (Array.isArray(raw)) {
        const textBlock = raw.find((block) => block.type === 'text');
        content = textBlock?.text || JSON.stringify(raw);
      } else if (typeof raw === 'string') {
        content = raw;
      } else {
        content = JSON.stringify(raw);
      }

      const clean = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      return JSON.parse(clean);
    } catch {
      return { error: 'parse_failed', rawContent: raw };
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import {
  AgentState,
  AnthropicContentBlock,
} from '../interfaces/agent-state.interface';
import { EXTRACTOR_SYSTEM_PROMPT } from '../prompts/extractor-system.prompt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class ExtractorAgentService {
  private readonly logger = new Logger(ExtractorAgentService.name);

  constructor(private readonly llmService: LlmService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    if (!state.attachments || state.attachments.length === 0) {
      this.logger.debug('No attachments found, skipping extraction');
      return {
        extractedData: { hasAttachments: false },
        nextAgent: 'history',
      };
    }

    try {
      const extracted = await this.extractFromAttachments(state.attachments);
      this.logger.debug('Extraction result', extracted);

      return {
        extractedData: { hasAttachments: true, ...extracted },
        nextAgent: 'history',
      };
    } catch (err) {
      this.logger.error('Error during extraction', err);
      return {
        extractedData: { hasAttachments: true, error: 'extraction_failed' },
        nextAgent: 'history',
      };
    }
  }

  private async extractFromAttachments(
    attachments: AnthropicContentBlock[],
  ): Promise<Record<string, unknown>> {
    const model = this.llmService.getModel();

    // Build multimodal content: text prompt + all attachment blocks
    const contentBlocks: any[] = [
      {
        type: 'text',
        text: 'Analiza el/los siguiente(s) documento(s) adjunto(s) y extrae la información solicitada.',
      },
      ...attachments,
    ];

    const messages = [
      new SystemMessage(EXTRACTOR_SYSTEM_PROMPT),
      new HumanMessage({ content: contentBlocks }),
    ];

    const response = await model.invoke(messages);
    const raw = response.content as string;

    return this.parseJson(raw);
  }

  private parseJson(raw: string): Record<string, unknown> {
    try {
      // Strip potential markdown code fences if model adds them
      const clean = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      return JSON.parse(clean) as Record<string, unknown>;
    } catch {
      this.logger.warn('Could not parse extractor JSON response', raw);
      return { raw, parseError: true };
    }
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';

@Injectable()
export class LlmService {
  private model: ChatAnthropic;

  constructor(private readonly configService: ConfigService) {
    const anthropic = this.configService.get('anthropic');

    this.model = new ChatAnthropic({
      model: anthropic.model,
      apiKey: anthropic.apiKey,
      clientOptions: {
        baseURL: anthropic.baseUrl,
      },
      temperature: 0.7,
      maxTokens: 4096,
    });
  }

  getModel(): ChatAnthropic {
    return this.model;
  }
}

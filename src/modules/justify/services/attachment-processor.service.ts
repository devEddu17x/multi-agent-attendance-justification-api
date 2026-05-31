import { Injectable, Logger } from '@nestjs/common';
import { JustifyStorageService } from './justify-storage.service';
import { AnthropicContentBlock } from '../../../agents/interfaces/agent-state.interface';

@Injectable()
export class AttachmentProcessorService {
  private readonly logger = new Logger(AttachmentProcessorService.name);

  constructor(private readonly justifyStorageService: JustifyStorageService) {}

  async process(fileIds: string[]): Promise<AnthropicContentBlock[]> {
    const blocks: AnthropicContentBlock[] = [];
    for (const fileId of fileIds) {
      try {
        const block = await this.processFile(fileId);
        if (block) blocks.push(block);
      } catch (err) {
        this.logger.warn(`Failed to process attachment ${fileId}`, err);
      }
    }
    return blocks;
  }

  private async processFile(
    fileId: string,
  ): Promise<AnthropicContentBlock | null> {
    const url = this.justifyStorageService.getFileUrls([fileId])[0];
    if (!url) return null;

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || '';

    const type = this.detectType(fileId, contentType);
    if (!type) return null;

    return {
      type,
      source: {
        type: 'base64',
        media_type: this.resolveMediaType(type, contentType),
        data: base64,
      },
    };
  }

  private detectType(
    fileId: string,
    contentType: string,
  ): 'document' | 'image' | null {
    if (contentType.includes('pdf') || fileId.endsWith('.pdf')) {
      return 'document';
    }
    if (
      contentType.includes('image') ||
      /\.(jpg|jpeg|png|gif|webp)$/i.test(fileId)
    ) {
      return 'image';
    }
    return null;
  }

  private resolveMediaType(
    type: 'document' | 'image',
    contentType: string,
  ): string {
    if (type === 'document') return 'application/pdf';
    return contentType || 'image/jpeg';
  }
}

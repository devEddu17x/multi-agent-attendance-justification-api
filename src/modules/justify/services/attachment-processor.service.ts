import { Injectable, Logger } from '@nestjs/common';
import { JustifyStorageService } from './justify-storage.service';
import { AnthropicContentBlock } from '../../../agents/interfaces/anthropic-content-block.interface';

@Injectable()
export class AttachmentProcessorService {
  private readonly logger = new Logger(AttachmentProcessorService.name);

  constructor(private readonly justifyStorageService: JustifyStorageService) {}

  async process(fileIds: string[]): Promise<AnthropicContentBlock[]> {
    const results = await Promise.allSettled(
      fileIds.map((id) => this.processFile(id)),
    );

    return results
      .filter(
        (r): r is PromiseFulfilledResult<AnthropicContentBlock | null> =>
          r.status === 'fulfilled',
      )
      .map((r) => r.value)
      .filter((block): block is AnthropicContentBlock => block !== null);
  }

  private async processFile(
    fileId: string,
  ): Promise<AnthropicContentBlock | null> {
    try {
      const signedUrl =
        await this.justifyStorageService.getPresignedDownloadUrl(fileId);
      const response = await fetch(signedUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = response.headers.get('content-type') || '';
      const type = detectType(fileId, contentType);
      if (!type) {
        return null;
      }

      return buildBlock(type, contentType, base64);
    } catch (err) {
      this.logger.error(`Failed to process attachment ${fileId}`, err);
      return null;
    }
  }
}

function detectType(
  fileId: string,
  contentType: string,
): 'document' | 'image' | null {
  if (contentType.includes('pdf') || fileId.endsWith('.pdf')) {
    return 'document';
  }
  if (
    contentType.includes('image') ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(fileId)
  )
    return 'image';
  return null;
}

function buildBlock(
  type: 'document' | 'image',
  contentType: string,
  base64: string,
): AnthropicContentBlock {
  return {
    type,
    source: {
      type: 'base64',
      media_type:
        type === 'document' ? 'application/pdf' : contentType || 'image/jpeg',
      data: base64,
    },
  };
}

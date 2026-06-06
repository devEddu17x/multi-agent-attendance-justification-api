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
    // Generate a short-lived signed GET URL to access the private bucket
    const signedUrl =
      await this.justifyStorageService.getPresignedDownloadUrl(fileId);
    this.logger.debug(`Downloading attachment from signed URL: key=${fileId}`);

    const response = await fetch(signedUrl);

    if (!response.ok) {
      this.logger.error(
        `Failed to download attachment ${fileId}: HTTP ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || '';

    const type = this.detectType(fileId, contentType);
    if (!type) {
      this.logger.warn(
        `Unsupported content type "${contentType}" for file ${fileId}`,
      );
      return null;
    }

    this.logger.debug(`Attachment processed: key=${fileId}, type=${type}`);

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

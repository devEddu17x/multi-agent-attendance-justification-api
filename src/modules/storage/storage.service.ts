import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PresignedPut } from './interfaces/presigned-url.interface';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucket: string;
  private url: string;

  constructor(private readonly configService: ConfigService) {
    const storage = this.configService.get('storage');
    this.s3 = new S3Client(storage.config);
    this.bucket = storage.bucket;
    this.url = storage.baseUrl;
  }

  async createPresignedPuts(
    files: { filename: string; contentType: string; key?: string }[],
    opts?: { ttlSeconds?: number; cacheControl?: string },
  ): Promise<PresignedPut[]> {
    if (!files || files.length === 0) {
      return [];
    }

    const ttl = opts?.ttlSeconds ?? 600;
    const cacheControl = opts?.cacheControl ?? 'no-cache';
    const results: PresignedPut[] = [];

    for (const f of files) {
      const key = f.key ?? f.filename;

      const cmd = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: f.contentType,
        CacheControl: cacheControl,
      });

      const putUrl = await getSignedUrl(this.s3, cmd, { expiresIn: ttl });
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

      results.push({
        key,
        putUrl,
        expiresAt,
        requiredHeaders: {
          'Content-Type': f.contentType,
        },
      });
    }

    return results;
  }

  getFileUrl(keys: string[]): string[] {
    return keys.map((key) => `${this.url}/${key}`);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1);
      return key;
    } catch {
      return null;
    }
  }

  async deleteObject(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (error) {
      console.error('Error deleting object from S3:', error);
      return false;
    }
  }
}

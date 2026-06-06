import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StorageService } from '../../storage/storage.service';
import { FilePlan } from '../../storage/interfaces/file-plan.interface';
import { PresignedPut } from '../../storage/interfaces/presigned-url.interface';

@Injectable()
export class JustifyStorageService {
  constructor(private readonly storageService: StorageService) {}

  generateJustificationKey(
    userId: string,
    studentId: string | undefined,
    filename: string,
  ): string {
    const ext = filename.includes('.') ? filename.split('.').pop() : 'bin';
    const uuid = randomUUID();
    const studentSegment = studentId ? `/${studentId}` : '';
    return `justifications/${userId}${studentSegment}/${uuid}.${ext}`;
  }

  getFileUrls(keys: string[]): string[] {
    return this.storageService.getFileUrl(keys);
  }

  getPresignedDownloadUrl(key: string): Promise<string> {
    return this.storageService.createPresignedGet(key);
  }

  async getPresignedUrlsForJustification(
    files: FilePlan[],
    userId: string,
    studentId?: string,
    opts?: { ttlSeconds?: number },
  ): Promise<PresignedPut[]> {
    const filesWithKeys = files.map((f) => ({
      ...f,
      key: this.generateJustificationKey(userId, studentId, f.filename),
    }));

    return this.storageService.createPresignedPuts(filesWithKeys, opts);
  }
}

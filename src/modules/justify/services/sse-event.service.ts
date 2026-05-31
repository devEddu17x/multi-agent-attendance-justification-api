import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { SessionStatus } from '../enums/session-status.enum';

@Injectable()
export class SseEventService {
  emitStatus(
    res: Response,
    type: string,
    payload?: Record<string, unknown>,
  ): void {
    this.emit(res, 'status', { type, ...payload });
  }

  emitMessage(res: Response, content: string, sessionId: string): void {
    this.emit(res, 'message', { role: 'assistant', content, sessionId });
  }

  emitDone(res: Response, sessionId: string, status: SessionStatus): void {
    this.emit(res, 'done', { sessionId, status });
  }

  emitError(res: Response, message: string): void {
    this.emit(res, 'error', { message });
  }

  close(res: Response): void {
    res.end();
  }

  private emit(
    res: Response,
    event: string,
    data: Record<string, unknown>,
  ): void {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

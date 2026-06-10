import { SessionStatus } from '../enums/session-status.enum';

export interface SessionResult {
  id: string;
  status: SessionStatus;
  isNew: boolean;
  extractedData?: Record<string, unknown>;
  historyOutput?: Record<string, unknown>;
  regulationsOutput?: Record<string, unknown>;
  finalVerdict?: Record<string, unknown>;
}

import { SessionStatus } from '../enums/session-status.enum';

export interface SessionResult {
  id: string;
  status: SessionStatus;
  isNew: boolean;
}

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { AttendanceService } from '../../attendance/services/attendance.service';
import { StudentsService } from '../../students/students.service';
import { SessionManagerService } from './session-manager.service';
import { AgentState } from '../../../agents/interfaces/agent-state.interface';
import { JustificationStatus } from '../../attendance/enums/justification-status.enum';
import { SessionStatus } from '../enums/session-status.enum';
import { AnthropicContentBlock } from '../../../agents/interfaces/anthropic-content-block.interface';
import { AttendanceEntity } from '../../attendance/entities/attendance.entity';
import { AttendanceJustificationEntity } from '../../attendance/entities/attendance-justification.entity';
import { AttendanceStatus } from '../../attendance/enums/attendance-status.enum';

interface TransactionalDecision {
  verdict: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
  reason: string;
  missingDocuments: string[];
  appliedArticle: string | null;
  sessionStatus: 'completed' | 'awaiting_documents' | 'cancelled';
}

@Injectable()
export class JustificationService {
  private readonly logger = new Logger(JustificationService.name);

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly studentsService: StudentsService,
    private readonly sessionManager: SessionManagerService,
  ) {}

  async persist(state: AgentState, decision: TransactionalDecision): Promise<void> {
    this.logger.log(`[PERSIST] Starting persist for studentId=${state.studentId}, decision=${JSON.stringify(decision)}`);
    
    if (!state.studentId) {
      this.logger.error('[PERSIST] No studentId in state');
      throw new BadRequestException('No studentId in state');
    }

    const student = await this.studentsService.getById(state.studentId);
    this.logger.log(`[PERSIST] Student found: id=${student.id}, parentId=${student.parentId}`);
    
    if (!student.parentId) {
      this.logger.error('[PERSIST] Student has no parent assigned');
      throw new BadRequestException('Student has no parent assigned');
    }

    const dates = this.extractDates(state.extractedData);
    this.logger.log(`[PERSIST] Extracted dates: ${JSON.stringify(dates)}`);
    this.logger.log(`[PERSIST] extractedData: ${JSON.stringify(state.extractedData)}`);
    
    // Fetch all records for the specified dates (any status)
    const allRecords = await this.attendanceService.getRecordsByStudentAndDates(
      state.studentId,
      dates,
    );
    this.logger.log(`[PERSIST] Found ${allRecords.length} records for dates`);

    // If no records found for the specified dates, create pre-absences
    if (allRecords.length === 0 && dates && dates.length > 0) {
      this.logger.log(`[PERSIST] No records found, creating pre-absences for dates: ${JSON.stringify(dates)}`);
      await this.attendanceService.createPreAbsences(state.studentId, dates);
      
      // Fetch all records again (including newly created ones)
      const newRecords = await this.attendanceService.getRecordsByStudentAndDates(
        state.studentId,
        dates,
      );
      this.logger.log(`[PERSIST] After pre-absences, found ${newRecords.length} records`);

      if (newRecords.length === 0) {
        this.logger.error('[PERSIST] No records found after pre-absences creation');
        throw new BadRequestException('No absence records found for the specified dates');
      }

      return this.processRecords(newRecords, state.studentId, student.id, student.parentId, decision, state);
    }

    return this.processRecords(allRecords, state.studentId, student.id, student.parentId, decision, state);
  }

  private async processRecords(
    records: AttendanceEntity[],
    studentId: string,
    studentIdForJustification: string,
    parentId: string,
    decision: TransactionalDecision,
    state: AgentState,
  ): Promise<void> {
    // Filter out already excused records
    const pendingRecords = records.filter((r) => r.status !== AttendanceStatus.EXCUSED);
    this.logger.log(`[PERSIST] ${pendingRecords.length} records pending justification (already excused: ${records.length - pendingRecords.length})`);

    // Check if there's an existing justification for these records
    const existingJustificationId = records.find((r) => r.justificationId)?.justificationId;
    let existingJustification: AttendanceJustificationEntity | null = null;
    if (existingJustificationId) {
      existingJustification = await this.attendanceService.getJustificationById(existingJustificationId);
    }
    
    if (existingJustification && existingJustificationId && state.attachments?.length) {
      // Update existing justification with new evidence
      this.logger.log(`[PERSIST] Updating existing justification ${existingJustificationId} with new evidence`);
      await this.attendanceService.updateJustification(existingJustificationId, {
        status: this.mapVerdict(decision.verdict),
        evidences: this.buildEvidences(state.attachments),
        aiMetadata: {
          verdict: decision.verdict,
          reason: decision.reason,
        },
      });
      this.logger.log('[PERSIST] Justification updated successfully');
    } else if (pendingRecords.length > 0) {
      this.logger.log(`[PERSIST] Creating justification with attendanceIds: ${pendingRecords.map(r => r.id).join(', ')}`);
      await this.attendanceService.createJustification({
        attendanceIds: pendingRecords.map((r) => r.id),
        studentId: studentIdForJustification,
        parentId: parentId,
        reason: this.extractReason(state.extractedData),
        status: this.mapVerdict(decision.verdict),
        evidences: this.buildEvidences(state.attachments),
        aiMetadata: {
          verdict: decision.verdict,
          reason: decision.reason,
        },
      });
      this.logger.log('[PERSIST] Justification created successfully');
    } else {
      this.logger.log('[PERSIST] All records already excused, skipping justification creation');
    }

    await this.sessionManager.updateSessionStatus(state.sessionId, {
      status: this.mapSessionStatus(decision.sessionStatus),
      appliedArticle: decision.appliedArticle,
      requiredDocuments: decision.missingDocuments,
      finalVerdict: {
        verdict: decision.verdict,
        reason: decision.reason,
      },
    });
    this.logger.log('[PERSIST] Session status updated successfully');
  }

  private extractDates(extractedData?: Record<string, unknown>): string[] | undefined {
    if (!extractedData) return undefined;
    const dates = (extractedData.fechasAusencia ?? extractedData.absenceDates) as string[] | undefined;
    return dates;
  }

  private extractReason(extractedData?: Record<string, unknown>): string {
    if (!extractedData) return 'Justificación enviada por el padre';
    return (extractedData.motivoAusencia ?? extractedData.rawSummary ?? 'Justificación enviada por el padre') as string;
  }

  private buildEvidences(
    attachments?: AnthropicContentBlock[],
  ): { key: string; type: string; name: string }[] | null {
    if (!attachments?.length) return null;

    return attachments
      .filter((a) => a.type !== 'text')
      .map((a, index) => ({
        key: `attachment_${index}`,
        type: a.type,
        name: `attachment_${index + 1}`,
      }));
  }

  private mapVerdict(
    verdict: TransactionalDecision['verdict'],
  ): JustificationStatus {
    switch (verdict) {
      case 'AUTO_APPROVED':
        return JustificationStatus.AUTO_APPROVED;
      case 'REJECTED':
        return JustificationStatus.REJECTED;
      default:
        return JustificationStatus.PENDING_REVIEW;
    }
  }

  private mapSessionStatus(
    sessionStatus: TransactionalDecision['sessionStatus'],
  ): SessionStatus {
    switch (sessionStatus) {
      case 'completed':
        return SessionStatus.COMPLETED;
      case 'cancelled':
        return SessionStatus.CANCELLED;
      default:
        return SessionStatus.AWAITING_DOCUMENTS;
    }
  }
}

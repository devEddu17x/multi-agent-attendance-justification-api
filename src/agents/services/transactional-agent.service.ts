import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmService } from './llm.service';
import { AgentState } from '../interfaces/agent-state.interface';
import { TRANSACTIONAL_SYSTEM_PROMPT } from '../prompts/transactional-system.prompt';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { AttendanceService } from '../../modules/attendance/services/attendance.service';
import { JustificationSessionEntity } from '../../modules/justify/entities/justification-session.entity';
import { JustificationStatus } from '../../modules/attendance/enums/justification-status.enum';
import { SessionStatus } from '../../modules/justify/enums/session-status.enum';

interface TransactionalDecision {
  verdict: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
  reason: string;
  missingDocuments: string[];
  appliedArticle: string | null;
  sessionStatus: 'completed' | 'awaiting_documents' | 'cancelled';
}

@Injectable()
export class TransactionalAgentService {
  private readonly logger = new Logger(TransactionalAgentService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly attendanceService: AttendanceService,
    @InjectRepository(JustificationSessionEntity)
    private readonly sessionRepo: Repository<JustificationSessionEntity>,
  ) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    const decision = await this.getDecisionFromLlm(state);
    await this.persistDecision(state, decision);
    return { nextAgent: 'communicator' };
  }

  private async getDecisionFromLlm(
    state: AgentState,
  ): Promise<TransactionalDecision> {
    const model = this.llmService.getModel();

    const context = {
      extractedData: state.extractedData ?? {},
      historyOutput: state.historyOutput ?? {},
      regulationsOutput: state.regulationsOutput ?? {},
    };

    const messages = [
      new SystemMessage(TRANSACTIONAL_SYSTEM_PROMPT),
      new HumanMessage(
        `Analiza la siguiente información y emite tu veredicto:\n${JSON.stringify(context, null, 2)}`,
      ),
    ];

    try {
      const response = await model.invoke(messages);
      const raw = (response.content as string).trim();
      return JSON.parse(raw) as TransactionalDecision;
    } catch (error) {
      this.logger.warn(
        'Transactional agent failed to parse LLM response, defaulting to PENDING_REVIEW',
        error,
      );
      return {
        verdict: 'PENDING_REVIEW',
        reason: 'No se pudo determinar el veredicto automáticamente',
        missingDocuments: [],
        appliedArticle: null,
        sessionStatus: 'awaiting_documents',
      };
    }
  }

  private async persistDecision(
    state: AgentState,
    decision: TransactionalDecision,
  ): Promise<void> {
    await Promise.all([
      this.persistJustifications(state, decision),
      this.updateSession(state, decision),
    ]);
  }

  private async persistJustifications(
    state: AgentState,
    decision: TransactionalDecision,
  ): Promise<void> {
    if (!state.studentId) {
      this.logger.warn(
        'No studentId in state, skipping justification persistence',
      );
      return;
    }

    const extracted = state.extractedData ?? {};
    const absenceDates = extracted.absenceDates as string[] | undefined;
    const absenceDays = extracted.absenceDays as number | undefined;

    const attendanceRecords =
      await this.attendanceService.getAbsentOrLateRecordsByStudent(
        state.studentId,
        absenceDates,
        absenceDays ?? 1,
      );

    if (attendanceRecords.length === 0) {
      this.logger.warn(
        `No attendance records found for student ${state.studentId}`,
      );
      return;
    }

    const parentId = await this.attendanceService.getParentIdByStudentId(
      state.studentId,
    );

    if (!parentId) {
      this.logger.warn(
        `Could not resolve parentId for student ${state.studentId}`,
      );
      return;
    }

    const justificationStatus = this.mapVerdictToStatus(decision.verdict);
    const evidences = this.buildEvidences(state);
    const reason =
      (extracted.rawSummary as string) ?? 'Justificación enviada por el padre';
    const aiMetadata = {
      verdict: decision.verdict,
      reason: decision.reason,
      appliedArticle: decision.appliedArticle,
      missingDocuments: decision.missingDocuments,
      extractedData: state.extractedData,
      regulationsOutput: state.regulationsOutput,
      historyOutput: state.historyOutput,
    };

    await Promise.all(
      attendanceRecords.map((record) =>
        this.attendanceService.createJustification(
          record.id,
          parentId,
          reason,
          justificationStatus,
          evidences,
          aiMetadata,
        ),
      ),
    );

    this.logger.log(
      `Persisted ${attendanceRecords.length} justification(s) with status ${justificationStatus}`,
    );
  }

  private async updateSession(
    state: AgentState,
    decision: TransactionalDecision,
  ): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: state.sessionId },
    });

    if (!session) {
      this.logger.warn(`Session ${state.sessionId} not found`);
      return;
    }

    session.status = this.mapSessionStatus(decision.sessionStatus);
    session.appliedArticle = decision.appliedArticle;
    session.requiredDocuments =
      decision.missingDocuments.length > 0 ? decision.missingDocuments : null;
    session.finalVerdict = {
      verdict: decision.verdict,
      reason: decision.reason,
    };

    await this.sessionRepo.save(session);
  }

  private buildEvidences(
    state: AgentState,
  ): { url: string; type: string; name: string }[] | null {
    const attachments = state.attachments;
    if (!attachments || attachments.length === 0) return null;

    return attachments
      .filter((block) => block.type !== 'text')
      .map((block, index) => ({
        url: '',
        type: block.type,
        name: `attachment_${index + 1}`,
      }));
  }

  private mapVerdictToStatus(
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

  private async getDecisionFromLlm(
    state: AgentState,
  ): Promise<TransactionalDecision> {
    const model = this.llmService.getModel();

    const context = {
      extractedData: state.extractedData ?? {},
      historyOutput: state.historyOutput ?? {},
      regulationsOutput: state.regulationsOutput ?? {},
    };

    const messages = [
      new SystemMessage(TRANSACTIONAL_SYSTEM_PROMPT),
      new HumanMessage(
        `Analiza la siguiente información y emite tu veredicto:\n${JSON.stringify(context, null, 2)}`,
      ),
    ];

    try {
      const response = await model.invoke(messages);
      const raw = (response.content as string).trim();
      return JSON.parse(raw) as TransactionalDecision;
    } catch (error) {
      this.logger.warn(
        'Transactional agent failed to parse LLM response, defaulting to PENDING_REVIEW',
        error,
      );
      return {
        verdict: 'PENDING_REVIEW',
        reason: 'No se pudo determinar el veredicto automáticamente',
        missingDocuments: [],
        appliedArticle: null,
        sessionStatus: 'awaiting_documents',
      };
    }
  }

  private async persistDecision(
    state: AgentState,
    decision: TransactionalDecision,
  ): Promise<void> {
    await Promise.all([
      this.persistJustifications(state, decision),
      this.updateSession(state, decision),
    ]);
  }

  private async persistJustifications(
    state: AgentState,
    decision: TransactionalDecision,
  ): Promise<void> {
    if (!state.studentId) {
      this.logger.warn(
        'No studentId in state, skipping justification persistence',
      );
      return;
    }

    const extracted = state.extractedData ?? {};
    const absenceDates = extracted.absenceDates as string[] | undefined;

    let attendanceRecords: AttendanceEntity[] = [];

    if (absenceDates && absenceDates.length > 0) {
      const dateObjects = absenceDates.map((d) => new Date(d));
      attendanceRecords = await this.attendanceRepo.find({
        where: {
          studentId: state.studentId,
          status: In([AttendanceStatus.ABSENT, AttendanceStatus.LATE]),
        },
      });

      attendanceRecords = attendanceRecords.filter((record) => {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        return dateObjects.some(
          (d) => d.toISOString().split('T')[0] === recordDate,
        );
      });
    } else {
      attendanceRecords = await this.attendanceRepo.find({
        where: {
          studentId: state.studentId,
          status: In([AttendanceStatus.ABSENT, AttendanceStatus.LATE]),
        },
        order: { date: 'DESC' },
        take: (extracted.absenceDays as number | undefined) ?? 1,
      });
    }

    if (attendanceRecords.length === 0) {
      this.logger.warn(
        `No attendance records found for student ${state.studentId}`,
      );
      return;
    }

    const justificationStatus = this.mapVerdictToStatus(decision.verdict);
    const evidences = this.buildEvidences(state);
    const parentId = await this.resolveParentId(state);

    if (!parentId) {
      this.logger.warn(
        `Could not resolve parentId for userId ${state.userId}, skipping justification persistence`,
      );
      return;
    }

    const justifications = attendanceRecords.map((record) =>
      this.justificationRepo.create({
        attendanceId: record.id,
        parentId,
        requestDate: new Date(),
        reason:
          (extracted.rawSummary as string) ??
          'Justificación enviada por el padre',
        evidences,
        status: justificationStatus,
        aiMetadata: {
          verdict: decision.verdict,
          reason: decision.reason,
          appliedArticle: decision.appliedArticle,
          missingDocuments: decision.missingDocuments,
          extractedData: state.extractedData,
          regulationsOutput: state.regulationsOutput,
          historyOutput: state.historyOutput,
        },
      }),
    );

    await this.justificationRepo.save(justifications);
    this.logger.log(
      `Persisted ${justifications.length} justification(s) with status ${justificationStatus} for student ${state.studentId}`,
    );
  }

  private async updateSession(
    state: AgentState,
    decision: TransactionalDecision,
  ): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: state.sessionId },
    });

    if (!session) {
      this.logger.warn(`Session ${state.sessionId} not found`);
      return;
    }

    session.status = this.mapSessionStatus(decision.sessionStatus);
    session.appliedArticle = decision.appliedArticle;
    session.requiredDocuments =
      decision.missingDocuments.length > 0 ? decision.missingDocuments : null;
    session.finalVerdict = {
      verdict: decision.verdict,
      reason: decision.reason,
    };

    await this.sessionRepo.save(session);
  }

  private async resolveParentId(state: AgentState): Promise<string | null> {
    if (!state.studentId) return null;

    const attendance = await this.attendanceRepo.findOne({
      where: { studentId: state.studentId },
      relations: { student: { parent: true } },
    });

    return attendance?.student?.parent?.id ?? null;
  }

  private buildEvidences(
    state: AgentState,
  ): { url: string; type: string; name: string }[] | null {
    const attachments = state.attachments;
    if (!attachments || attachments.length === 0) return null;

    return attachments
      .filter((block) => block.type !== 'text')
      .map((block, index) => ({
        url: '',
        type: block.type,
        name: `attachment_${index + 1}`,
      }));
  }

  private mapVerdictToStatus(
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

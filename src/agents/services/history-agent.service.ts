import { Injectable, Logger } from '@nestjs/common';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../interfaces/agent-state.interface';
import { LlmService } from './llm.service';
import { StudentsService } from '../../modules/students/students.service';
import { AttendanceService } from '../../modules/attendance/services/attendance.service';
import { HISTORY_SYSTEM_PROMPT } from '../prompts/history-system.prompt';
import { HistoryAnalysis } from '../interfaces/history-analysis.interface';

const EMPTY_ANALYSIS: HistoryAnalysis = {
  absenceCount: 0,
  lateCount: 0,
  excusedCount: 0,
  unjustifiedAbsenceCount: 0,
  maxConsecutiveAbsences: 0,
  riskFlags: [],
  patterns: [],
  riskScore: 0,
  justificationConfidence: 0.5,
  summary: '',
};

@Injectable()
export class HistoryAgentService {
  private readonly logger = new Logger(HistoryAgentService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly studentsService: StudentsService,
    private readonly attendanceService: AttendanceService,
  ) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    if (!state.studentId) {
      return {
        historyOutput: {
          available: false,
          reason: 'student_id_missing',
          ...EMPTY_ANALYSIS,
          summary: 'No se proporcionó ID del estudiante.',
        },
      };
    }

    try {
      const [student, attendances] = await Promise.all([
        this.studentsService.getById(state.studentId),
        this.attendanceService.getParentStudentAttendanceByStudentId(
          state.userId,
          state.studentId,
        ),
      ]);

      const model = this.llmService.getModel();

      const humanContent = [
        `ESTUDIANTE:`,
        `- Nombre: ${student.firstName} ${student.lastName}`,
        `- ID: ${student.id}`,
        `- Estado activo: ${student.isActive}`,
        ``,
        `REGISTROS DE ASISTENCIA DEL MES ACTUAL (${attendances.length} registros):`,
        JSON.stringify(attendances, null, 2),
        ``,
        `Analiza el historial de asistencia y devuelve tu evaluación en JSON.`,
      ].join('\n');

      const response = await model.invoke([
        new SystemMessage(HISTORY_SYSTEM_PROMPT),
        new HumanMessage(humanContent),
      ]);

      const raw = (response.content as string).trim();
      const analysis = JSON.parse(raw) as HistoryAnalysis;

      this.logger.log(
        `History analysis for student ${student.id}: riskScore=${analysis.riskScore}, flags=${analysis.riskFlags.join(',')}`,
      );

      return {
        historyOutput: {
          available: true,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          recordCount: attendances.length,
          ...analysis,
        },
      };
    } catch (error) {
      const isBadRequest =
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        (error as { status: number }).status === 400;

      if (isBadRequest) {
        const message =
          error instanceof Error
            ? error.message
            : 'Acceso denegado al historial del estudiante';
        this.logger.warn(`History agent — acceso no autorizado: ${message}`);
        return {
          historyOutput: {
            available: false,
            reason: 'unauthorized_student_access',
            ...EMPTY_ANALYSIS,
            riskFlags: ['unauthorized_student_access'],
            riskScore: 10,
            justificationConfidence: 0,
            summary: message,
          },
        };
      }

      this.logger.error('History agent falló inesperadamente', error);
      return {
        historyOutput: {
          available: false,
          reason: 'history_query_failed',
          ...EMPTY_ANALYSIS,
          riskFlags: ['history_query_failed'],
          summary: 'No se pudo recuperar el historial de asistencia.',
        },
      };
    }
  }
}

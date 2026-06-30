import { Injectable } from '@nestjs/common';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../interfaces/agent-state.interface';
import { LlmService } from './llm.service';
import { StudentsService } from '../../modules/students/students.service';
import { AttendanceService } from '../../modules/attendance/services/attendance.service';
import { HISTORY_SYSTEM_PROMPT } from '../prompts/history-system.prompt';
import { HistoryAnalysis } from '../interfaces/history-analysis.interface';
import {
  asNumber,
  asString,
  asStringArray,
  parseLlmJson,
} from '../utils/llm-json.util';

@Injectable()
export class HistoryAgentService {
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
          reason: 'missing_student_id',
        },
      };
    }

    const [student, attendances, justifications] = await Promise.all([
      this.studentsService.getById(state.studentId),
      this.attendanceService.getParentStudentAttendanceByStudentId(
        state.userId,
        state.studentId,
      ),
      this.attendanceService.getJustificationsByStudentId(state.studentId),
    ]);

    const model = this.llmService.getModel();

    const compactData = {
      student: {
        name: `${student.firstName} ${student.lastName}`,
      },
      attendanceRecords: attendances.map((a) => ({
        date: a.date,
        day: a.schedule.dayOfWeek,
        status: a.status,
        course: a.course.name,
      })),
      justificationHistory: justifications.map((j) => ({
        date: j.date,
        reason: j.reason,
        status: j.status,
      })),
    };

    const response = await model.invoke([
      new SystemMessage(HISTORY_SYSTEM_PROMPT),
      new HumanMessage(JSON.stringify(compactData, null, 2)),
    ]);

    const analysis = parseLlmJson(
      response.content,
      fallbackHistoryAnalysis(),
      normalizeHistoryAnalysis,
    );

    return {
      historyOutput: analysis as unknown as Record<string, unknown>,
    };
  }
}

function fallbackHistoryAnalysis(): HistoryAnalysis {
  return {
    available: false,
    reason: 'parse_failed',
    riskFlags: [],
    patterns: [],
    riskScore: 0,
    justificationConfidence: 0.5,
    summary:
      'No se pudo analizar el historial automaticamente, pero el flujo puede continuar.',
  };
}

function normalizeHistoryAnalysis(value: unknown): HistoryAnalysis {
  const data =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return {
    available: true,
    reason: asString(data.reason),
    riskFlags: asStringArray(data.riskFlags),
    patterns: asStringArray(data.patterns),
    riskScore: clamp(asNumber(data.riskScore, 0)),
    justificationConfidence: clamp(asNumber(data.justificationConfidence, 0.5)),
    summary: asString(data.summary, 'Historial analizado.'),
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

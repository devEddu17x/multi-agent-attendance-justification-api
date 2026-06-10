import { Injectable } from '@nestjs/common';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../interfaces/agent-state.interface';
import { LlmService } from './llm.service';
import { StudentsService } from '../../modules/students/students.service';
import { AttendanceService } from '../../modules/attendance/services/attendance.service';
import { HISTORY_SYSTEM_PROMPT } from '../prompts/history-system.prompt';
import { HistoryAnalysis } from '../interfaces/history-analysis.interface';

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

    const analysis = JSON.parse(response.content as string) as HistoryAnalysis;

    return {
      historyOutput: analysis as unknown as Record<string, unknown>,
    };
  }
}

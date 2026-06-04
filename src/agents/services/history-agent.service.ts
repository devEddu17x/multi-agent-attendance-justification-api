import { Injectable } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, MoreThanOrEqual } from 'typeorm';
import { StudentEntity } from '../../modules/students/entities/student.entity';
import { AttendanceEntity } from '../../modules/attendance/entities/attendance.entity';
import { AttendanceJustificationEntity } from '../../modules/attendance/entities/attendance-justification.entity';
import { AttendanceStatus } from '../../modules/attendance/enums/attendance-status.enum';
import { JustificationStatus } from '../../modules/attendance/enums/justification-status.enum';

@Injectable()
export class HistoryAgentService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    if (!state.studentId) {
      return {
        historyOutput: {
          available: false,
          reason: 'student_id_missing',
          absenceCount: 0,
          lateCount: 0,
          riskFlags: [],
          patterns: [],
        },
        nextAgent: 'regulations',
      };
    }

    try {
      const studentRepository = this.dataSource.getRepository(StudentEntity);
      const attendanceRepository =
        this.dataSource.getRepository(AttendanceEntity);
      const justificationRepository = this.dataSource.getRepository(
        AttendanceJustificationEntity,
      );

      const student = await studentRepository.findOne({
        where: { id: state.studentId },
        relations: {
          parent: {
            user: true,
          },
        },
      });

      if (!student) {
        return {
          historyOutput: {
            available: false,
            reason: 'student_not_found',
            absenceCount: 0,
            lateCount: 0,
            riskFlags: ['student_not_found'],
            patterns: [],
          },
          nextAgent: 'regulations',
        };
      }

      const isAuthorizedParent = student.parent?.userId === state.userId;
      if (!isAuthorizedParent) {
        return {
          historyOutput: {
            available: false,
            reason: 'unauthorized_student_access',
            absenceCount: 0,
            lateCount: 0,
            riskFlags: ['unauthorized_student_access'],
            patterns: [],
          },
          nextAgent: 'regulations',
        };
      }

      const since = new Date();
      since.setDate(since.getDate() - 60);

      const attendanceRows = await attendanceRepository.find({
        where: {
          studentId: student.id,
          date: MoreThanOrEqual(since),
        },
        order: {
          date: 'ASC',
        },
      });

      const attendanceIds = attendanceRows.map((row) => row.id);
      const justifications = attendanceIds.length
        ? await justificationRepository.find({
            where: {
              attendanceId: In(attendanceIds),
            },
          })
        : [];

      const absenceCount = attendanceRows.filter(
        (row) => row.status === AttendanceStatus.ABSENT,
      ).length;
      const lateCount = attendanceRows.filter(
        (row) => row.status === AttendanceStatus.LATE,
      ).length;

      const approvedJustificationIds = new Set(
        justifications
          .filter((j) => j.status === JustificationStatus.AUTO_APPROVED)
          .map((j) => j.attendanceId),
      );

      const pendingJustificationIds = new Set(
        justifications
          .filter((j) => j.status === JustificationStatus.PENDING_REVIEW)
          .map((j) => j.attendanceId),
      );

      const rejectedJustificationIds = new Set(
        justifications
          .filter((j) => j.status === JustificationStatus.REJECTED)
          .map((j) => j.attendanceId),
      );

      const unjustifiedAbsenceCount = attendanceRows.filter(
        (row) =>
          row.status === AttendanceStatus.ABSENT &&
          !approvedJustificationIds.has(row.id),
      ).length;

      const weekdayAbsentCount: Record<string, number> = {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0,
      };

      let maxConsecutiveAbsences = 0;
      let currentStreak = 0;
      for (const row of attendanceRows) {
        if (row.status === AttendanceStatus.ABSENT) {
          currentStreak += 1;
          if (currentStreak > maxConsecutiveAbsences) {
            maxConsecutiveAbsences = currentStreak;
          }
        } else {
          currentStreak = 0;
        }

        if (row.status === AttendanceStatus.ABSENT) {
          const dayIndex = new Date(row.date).getDay();
          const dayByIndex = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ][dayIndex];
          weekdayAbsentCount[dayByIndex] += 1;
        }
      }

      const riskFlags: string[] = [];
      if (unjustifiedAbsenceCount >= 2) {
        riskFlags.push('recurrent_unjustified_absences');
      }
      if (lateCount >= 3) {
        riskFlags.push('recurrent_late_arrivals');
      }
      if (maxConsecutiveAbsences >= 2) {
        riskFlags.push('consecutive_absence_pattern');
      }
      if (rejectedJustificationIds.size > 0) {
        riskFlags.push('has_rejected_justifications');
      }

      const mostAbsentDay = Object.entries(weekdayAbsentCount).sort(
        (a, b) => b[1] - a[1],
      )[0];

      const patterns: string[] = [];
      if (mostAbsentDay?.[1] > 0) {
        patterns.push(`highest_absence_day:${mostAbsentDay[0]}`);
      }
      if (pendingJustificationIds.size > 0) {
        patterns.push('pending_justifications_present');
      }

      return {
        historyOutput: {
          available: true,
          studentId: student.id,
          lookbackDays: 60,
          attendanceRecords: attendanceRows.length,
          absenceCount,
          lateCount,
          unjustifiedAbsenceCount,
          maxConsecutiveAbsences,
          justificationSummary: {
            approved: approvedJustificationIds.size,
            pending: pendingJustificationIds.size,
            rejected: rejectedJustificationIds.size,
          },
          weekdayAbsentCount,
          riskFlags,
          patterns,
        },
        nextAgent: 'regulations',
      };
    } catch {
      return {
        historyOutput: {
          available: false,
          reason: 'history_query_failed',
          absenceCount: 0,
          lateCount: 0,
          riskFlags: ['history_query_failed'],
          patterns: [],
        },
        nextAgent: 'regulations',
      };
    }
  }
}

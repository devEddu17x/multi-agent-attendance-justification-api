import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Equal, In, Repository, DataSource } from 'typeorm';
import { RekognitionService } from './rekognition.service';
import { StudentsService } from '../../students/students.service';
import { AttendanceEntity } from '../entities/attendance.entity';
import { AttendanceStatus } from '../enums/attendance-status.enum';
import { formatTimeHHMMSS } from '../../../utils/time.util';
import { LATE_GRACE_PERIOD_MINUTES } from '../constants/late-period.constant';
import { ScheduleService } from 'src/modules/academic-classes/services/schedule.service';
import { ParentEntity } from '../../parents/entities/parent.entity';
import { TeacherEntity } from '../../teachers/entities/teacher.entity';
import { ScheduleEntity } from '../../academic-classes/entities/schedule.entity';
import { EnrollmentEntity } from '../../academic-classes/entities/enrollment.entity';
import { StudentAttendanceResult } from '../interfaces/student-attendance-result.interface';
import { ScheduleAttendanceResult } from '../interfaces/schedule-attendance-result.interface';
import { AttendanceJustificationEntity } from '../entities/attendance-justification.entity';
import { JustificationStatus } from '../enums/justification-status.enum';
import { randomUUID } from 'crypto';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly rekognitionService: RekognitionService,
    private readonly studentsService: StudentsService,
    private readonly scheduleService: ScheduleService,
    @InjectRepository(AttendanceEntity)
    private readonly attendanceRepository: Repository<AttendanceEntity>,
    @InjectRepository(ParentEntity)
    private readonly parentRepository: Repository<ParentEntity>,
    @InjectRepository(TeacherEntity)
    private readonly teacherRepository: Repository<TeacherEntity>,
    @InjectRepository(ScheduleEntity)
    private readonly scheduleRepository: Repository<ScheduleEntity>,
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepository: Repository<EnrollmentEntity>,
    @InjectRepository(AttendanceJustificationEntity)
    private readonly justificationRepository: Repository<AttendanceJustificationEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async registerStudentFace(studentId: string, photo: Express.Multer.File) {
    const student = await this.studentsService.getById(studentId);
    const rekognitionId = await this.rekognitionService.registerFace(photo);
    const updatedStudent = await this.studentsService.updateRekognition(
      student.id,
      rekognitionId,
    );
    if (!updatedStudent.success) {
      return {
        message: 'Failed to register face for the student',
      };
    }
    return {
      message: 'Face registered successfully',
    };
  }

  async registerAttendance(photo: Express.Multer.File, simulatedTime?: Date) {
    const { faceId, confidenceScore } =
      await this.rekognitionService.searchFace(photo);

    const student = await this.studentsService.getByRekognitionId(faceId);

    const now = simulatedTime || new Date();
    const schedule = await this.scheduleService.getScheduleForStudent(
      student.id,
      now,
    );

    let status = AttendanceStatus.PRESENT;

    if (!schedule) {
      throw new BadRequestException(
        'No schedule found for the student at this time',
      );
    }
    const checkInMinutes = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const startTotal = startHour * 60 + startMin;

    if (checkInMinutes > startTotal + LATE_GRACE_PERIOD_MINUTES) {
      status = AttendanceStatus.LATE;
    }
    const checkInTimeStr = formatTimeHHMMSS(now);

    try {
      const attendance = await this.attendanceRepository.save({
        studentId: student.id,
        scheduleId: schedule.id,
        date: now,
        checkInTime: checkInTimeStr,
        status,
        confidenceScore,
      });

      return {
        status: attendance.status,
        student,
        schedule,
      };
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === '23505') {
        throw new ConflictException(
          'Attendance already registered for this schedule today',
        );
      }
      throw new InternalServerErrorException(
        'Failed to register attendance. Please try again later.',
      );
    }
  }

  async getParentStudentAttendance(parentId: string) {
    const studentsFromParent =
      await this.studentsService.getStudentsByParentEmail(parentId);
    return await this.attendanceRepository.find({
      where: { studentId: In(studentsFromParent.map((s) => s.id)) },
      relations: {
        student: true,
        schedule: true,
      },
      take: 30,
      order: { date: 'DESC' },
    });
  }

  async getParentStudentAttendanceByStudentId(
    userId: string,
    studentId: string,
  ): Promise<StudentAttendanceResult[]> {
    const parent = await this.parentRepository.findOne({
      where: { userId },
    });

    if (!parent) {
      throw new BadRequestException('No parent found for this user');
    }

    const studentsFromParent = await this.studentsService.getStudentsByParentId(
      parent.id,
    );

    const studentsIds = studentsFromParent.map((s) => s.id);

    if (!studentsIds || studentsIds.length === 0) {
      throw new BadRequestException('No students found for the parent');
    }
    if (!studentsIds.includes(studentId)) {
      throw new BadRequestException(
        'The specified student does not belong to the parent',
      );
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );

    const attendances = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .innerJoinAndSelect('attendance.schedule', 'schedule')
      .innerJoinAndSelect('schedule.classroomCourseTeacher', 'cct')
      .innerJoinAndSelect('cct.course', 'course')
      .innerJoinAndSelect('cct.teacher', 'teacher')
      .innerJoinAndSelect('teacher.user', 'teacherUser')
      .where('attendance.studentId = :studentId', { studentId })
      .andWhere('attendance.date >= :startOfMonth', { startOfMonth })
      .andWhere('attendance.date < :today', { today })
      .orderBy('attendance.date', 'DESC')
      .addOrderBy('attendance.checkInTime', 'DESC')
      .getMany();

    const dayNames = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];

    return attendances.map((a) => {
      const dateStr =
        a.date instanceof Date
          ? a.date.toISOString().split('T')[0]
          : new Date(a.date).toISOString().split('T')[0];

      return {
        id: a.id,
        date: dateStr,
        checkInTime: a.checkInTime,
        status: a.status,
        course: {
          id: a.schedule.classroomCourseTeacher.course.id,
          name: a.schedule.classroomCourseTeacher.course.name,
        },
        teacher: {
          id: a.schedule.classroomCourseTeacher.teacher.id,
          firstName: a.schedule.classroomCourseTeacher.teacher.user.firstName,
          lastName: a.schedule.classroomCourseTeacher.teacher.user.lastName,
        },
        schedule: {
          id: a.schedule.id,
          dayOfWeek: dayNames[a.schedule.dayOfWeek],
          startTime: a.schedule.startTime,
          endTime: a.schedule.endTime,
        },
      };
    });
  }

  async getTeacherStudentsAttendanceBySchedule(
    userId: string,
    scheduleId: string,
    date: Date | undefined,
  ): Promise<ScheduleAttendanceResult[]> {
    const teacher = await this.teacherRepository.findOne({
      where: { userId },
    });
    if (!teacher) {
      throw new BadRequestException('Teacher not found for this user');
    }

    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
      relations: {
        classroomCourseTeacher: true,
      },
    });
    if (!schedule) {
      throw new BadRequestException('Schedule not found');
    }
    if (schedule.classroomCourseTeacher.teacherId !== teacher.id) {
      throw new BadRequestException(
        'The specified schedule does not belong to the teacher',
      );
    }

    const targetDate = date instanceof Date ? date : new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    const enrollments = await this.enrollmentRepository.find({
      where: {
        classroomCourseTeacherId: schedule.classroomCourseTeacherId,
      },
      relations: {
        student: true,
      },
    });

    const studentIds = enrollments.map((e) => e.studentId);

    const attendances = await this.attendanceRepository.find({
      where: {
        studentId: In(studentIds),
        scheduleId,
        date: Equal(targetDate),
      },
    });

    const attendanceMap = new Map(attendances.map((a) => [a.studentId, a]));

    return enrollments.map((e) => {
      const a = attendanceMap.get(e.studentId);
      return {
        student: {
          id: e.student.id,
          firstName: e.student.firstName,
          lastName: e.student.lastName,
          documentNumber: e.student.documentNumber,
        },
        attendance: a
          ? {
              id: a.id,
              date: dateStr,
              checkInTime: a.checkInTime,
              status: a.status,
              confidenceScore: a.confidenceScore,
            }
          : null,
      };
    });
  }

  async createJustification(data: {
    attendanceIds: string[];
    studentId: string;
    parentId: string;
    reason: string;
    status: JustificationStatus;
    evidences: { key: string; type: string; name: string }[] | null;
    aiMetadata: { verdict: string; reason: string };
  }): Promise<AttendanceJustificationEntity> {
    const justification = await this.justificationRepository.save(
      this.justificationRepository.create({
        studentId: data.studentId,
        parentId: data.parentId,
        requestDate: new Date(),
        reason: data.reason,
        evidences: data.evidences,
        status: data.status,
        aiMetadata: data.aiMetadata,
      }),
    );

    // Link attendance records to the justification
    await this.attendanceRepository.update(
      { id: In(data.attendanceIds) },
      { justificationId: justification.id },
    );

    // If approved, mark attendance records as excused
    if (data.status === JustificationStatus.AUTO_APPROVED) {
      await this.attendanceRepository.update(
        { id: In(data.attendanceIds) },
        { status: AttendanceStatus.EXCUSED },
      );
    }

    return justification;
  }

  async updateJustification(
    justificationId: string,
    data: {
      status?: JustificationStatus;
      evidences?: { key: string; type: string; name: string }[] | null;
      aiMetadata?: { verdict: string; reason: string };
    },
  ): Promise<AttendanceJustificationEntity | null> {
    const justification = await this.justificationRepository.findOne({
      where: { id: justificationId },
    });
    
    if (!justification) {
      return null;
    }

    if (data.status !== undefined) {
      justification.status = data.status;
    }
    if (data.evidences !== undefined) {
      justification.evidences = data.evidences;
    }
    if (data.aiMetadata !== undefined) {
      justification.aiMetadata = data.aiMetadata;
    }

    const updated = await this.justificationRepository.save(justification);

    // If now approved, mark attendance records as excused
    if (data.status === JustificationStatus.AUTO_APPROVED) {
      await this.attendanceRepository.update(
        { justificationId: justification.id },
        { status: AttendanceStatus.EXCUSED },
      );
    }

    return updated;
  }

  async getJustificationById(
    justificationId: string,
  ): Promise<AttendanceJustificationEntity | null> {
    return this.justificationRepository.findOne({
      where: { id: justificationId },
    });
  }

  async getAbsentRecordsByStudent(
    studentId: string,
    dates?: string[],
  ): Promise<AttendanceEntity[]> {
    return this.getRecordsByStudentAndDates(studentId, dates, AttendanceStatus.ABSENT);
  }

  async getRecordsByStudentAndDates(
    studentId: string,
    dates?: string[],
    status?: AttendanceStatus,
  ): Promise<AttendanceEntity[]> {
    const where: any = { studentId };
    if (status) {
      where.status = status;
    }

    const all = await this.attendanceRepository.find({ where });
    
    if (dates && dates.length > 0) {
      return all.filter((record) => {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        return dates.some(
          (d) => new Date(d).toISOString().split('T')[0] === recordDate,
        );
      });
    }

    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getJustificationsByStudentId(
    studentId: string,
  ): Promise<{ date: string; reason: string; status: JustificationStatus }[]> {
    const justifications = await this.justificationRepository.find({
      where: { studentId },
      order: { requestDate: 'DESC' },
      take: 20,
    });

    return justifications.map((j) => ({
      date: j.requestDate.toISOString().split('T')[0],
      reason: j.reason,
      status: j.status,
    }));
  }

  async generateAbsences(dateStr: string): Promise<{ generated: number }> {
    // Validate date format (YYYY-MM-DD) and compute day of week
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      throw new BadRequestException(
        'Invalid date format. Use YYYY-MM-DD (e.g., 2026-06-05)',
      );
    }

    // Use a date at 12:00 UTC to avoid timezone boundary issues
    const dateObj = new Date(`${dateStr}T12:00:00Z`);
    const dayOfWeek = dateObj.getUTCDay() === 0 ? 7 : dateObj.getUTCDay();
    if (dayOfWeek === 6 || dayOfWeek === 7) {
      throw new BadRequestException('Only Monday to Friday are allowed');
    }

    // Raw SQL: find all student+schedule combos that should have attendance but don't
    const missingRecords = await this.dataSource.query(
      `
      SELECT s.id AS student_id, sch.id AS schedule_id
      FROM students s
      INNER JOIN enrollments e ON e.student_id = s.id
      INNER JOIN classroom_course_teacher cct ON cct.id = e.classroom_course_teacher_id
      INNER JOIN schedules sch ON sch.classroom_course_teacher_id = cct.id
      WHERE s.is_active = true
        AND sch.day_of_week = $1
        AND NOT EXISTS (
          SELECT 1 FROM attendance a
          WHERE a.student_id = s.id
            AND a.schedule_id = sch.id
            AND a.date = $2::date
        )
      `,
      [dayOfWeek, dateStr],
    );

    if (missingRecords.length === 0) {
      return { generated: 0 };
    }

    // Raw SQL: insert all absences at once using string dates
    const insertValues = missingRecords
      .map(
        (r) =>
          `('${randomUUID()}', '${r.student_id}', '${r.schedule_id}', '${dateStr}', 'ABSENT', NULL, 0, NULL)`,
      )
      .join(', ');

    await this.dataSource.query(
      `
      INSERT INTO attendance (id, student_id, schedule_id, date, status, check_in_time, confidence_score, justification_id)
      VALUES ${insertValues}
      `,
    );

    return { generated: missingRecords.length };
  }

  async createPreAbsences(
    studentId: string,
    dates: string[],
  ): Promise<AttendanceEntity[]> {
    const absences: AttendanceEntity[] = [];

    for (const dateStr of dates) {
      const date = new Date(dateStr);
      const jsDay = date.getDay();
      const dayOfWeek = jsDay === 0 ? 7 : jsDay;

      // Find the student's schedule for this day
      const schedule = await this.scheduleRepository
        .createQueryBuilder('schedule')
        .innerJoin('schedule.classroomCourseTeacher', 'cct')
        .innerJoin(
          'enrollments',
          'enr',
          'enr.classroom_course_teacher_id = cct.id',
        )
        .where('enr.student_id = :studentId', { studentId })
        .andWhere('schedule.day_of_week = :dayOfWeek', { dayOfWeek })
        .getOne();

      const absence: any = {
        studentId,
        scheduleId: schedule?.id ?? null,
        date,
        status: AttendanceStatus.ABSENT,
        checkInTime: null,
        confidenceScore: 0,
      };

      absences.push(absence);
    }

    return await Promise.all(
      absences.map((a) => this.attendanceRepository.save(a)),
    );
  }
}

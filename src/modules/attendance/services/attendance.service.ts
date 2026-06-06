import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Equal, In, Repository } from 'typeorm';
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
      if (this.isPostgresDuplicateKeyError(error)) {
        throw new ConflictException(
          'Attendance already registered for this schedule today',
        );
      }
      throw new InternalServerErrorException(
        'Failed to register attendance. Please try again later.',
      );
    }
  }

  private isPostgresDuplicateKeyError(
    error: unknown,
  ): error is { code: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string'
    );
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

  async createJustification(
    attendanceId: string,
    parentId: string,
    reason: string,
    status: JustificationStatus,
    evidences: { url: string; type: string; name: string }[] | null,
    aiMetadata: Record<string, unknown>,
  ): Promise<AttendanceJustificationEntity> {
    return this.justificationRepository.save(
      this.justificationRepository.create({
        attendanceId,
        parentId,
        requestDate: new Date(),
        reason,
        evidences,
        status,
        aiMetadata,
      }),
    );
  }

  async getAbsentOrLateRecordsByStudent(
    studentId: string,
    dates?: string[],
    limit = 1,
  ): Promise<AttendanceEntity[]> {
    if (dates && dates.length > 0) {
      const all = await this.attendanceRepository.find({
        where: {
          studentId,
          status: In([AttendanceStatus.ABSENT, AttendanceStatus.LATE]),
        },
      });
      return all.filter((record) => {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        return dates.some(
          (d) => new Date(d).toISOString().split('T')[0] === recordDate,
        );
      });
    }

    return this.attendanceRepository.find({
      where: {
        studentId,
        status: In([AttendanceStatus.ABSENT, AttendanceStatus.LATE]),
      },
      order: { date: 'DESC' },
      take: limit,
    });
  }

  async getParentIdByStudentId(studentId: string): Promise<string | null> {
    const record = await this.attendanceRepository.findOne({
      where: { studentId },
      relations: { student: { parent: true } },
    });
    return record?.student?.parent?.id ?? null;
  }
}

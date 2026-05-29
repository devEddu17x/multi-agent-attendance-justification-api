import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RekognitionService } from './rekognition.service';
import { StudentsService } from '../../students/students.service';
import { AttendanceEntity } from '../entities/attendance.entity';
import { AttendanceStatus } from '../enums/attendance-status.enum';
import { formatTimeHHMMSS } from '../../../utils/time.util';
import { LATE_GRACE_PERIOD_MINUTES } from '../constants/late-period.constant';
import { ScheduleService } from 'src/modules/academic-classes/services/schedule.service';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly rekognitionService: RekognitionService,
    private readonly studentsService: StudentsService,
    private readonly scheduleService: ScheduleService,
    @InjectRepository(AttendanceEntity)
    private readonly attendanceRepository: Repository<AttendanceEntity>,
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
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(
          'Attendance already registered for this schedule today',
        );
      }
      throw new InternalServerErrorException(
        'Failed to register attendance. Please try again later.',
      );
    }
  }
}

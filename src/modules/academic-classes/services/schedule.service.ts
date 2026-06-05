import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ScheduleEntity } from '../entities/schedule.entity';
import { ClassroomCourseTeacherEntity } from '../entities/classroom-course-teacher.entity';
import { AcademicYearEntity } from '../entities/academic-year.entity';
import { TeacherEntity } from '../../teachers/entities/teacher.entity';
import { CreateScheduleDTO } from '../dto/create-schedule.dto';
import { TeacherScheduleResult } from '../interfaces/teacher-schedule-result.interface';
import { formatTimeHHMMSS } from 'src/utils/time.util';
import { Repository } from 'typeorm';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(ScheduleEntity)
    private readonly scheduleRepository: Repository<ScheduleEntity>,
    @InjectRepository(ClassroomCourseTeacherEntity)
    private readonly classroomCourseTeacherRepository: Repository<ClassroomCourseTeacherEntity>,
    @InjectRepository(AcademicYearEntity)
    private readonly academicYearRepository: Repository<AcademicYearEntity>,
    @InjectRepository(TeacherEntity)
    private readonly teacherRepository: Repository<TeacherEntity>,
  ) {}

  async create(dto: CreateScheduleDTO): Promise<ScheduleEntity> {
    try {
      const academicYear = await this.academicYearRepository.findOne({
        order: { year: 'DESC' },
      });

      if (!academicYear) {
        throw new NotFoundException(
          'No academic year found. Please create one first.',
        );
      }

      const classroomCourseTeacher =
        this.classroomCourseTeacherRepository.create({
          academicYearId: academicYear.id,
          courseId: dto.courseId,
          classroomId: dto.classroomId,
          teacherId: dto.teacherId,
        });

      const savedCCT = await this.classroomCourseTeacherRepository.save(
        classroomCourseTeacher,
      );

      const schedule = this.scheduleRepository.create({
        classroomCourseTeacherId: savedCCT.id,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      });

      return await this.scheduleRepository.save(schedule);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Failed to create schedule', error);
      throw new InternalServerErrorException('Could not create schedule');
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      const schedule = await this.scheduleRepository.findOne({
        where: { id },
      });

      if (!schedule) {
        throw new NotFoundException('Schedule not found');
      }

      const cctId = schedule.classroomCourseTeacherId;

      await this.scheduleRepository.delete(id);

      await this.classroomCourseTeacherRepository.delete(cctId);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to delete schedule with id ${id}`, error);
      throw new InternalServerErrorException('Could not delete schedule');
    }
  }

  async getScheduleForStudent(
    studentId: string,
    time: Date,
  ): Promise<ScheduleEntity | null> {
    const jsDay = time.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    const checkInTimeStr = formatTimeHHMMSS(time);
    const timePlus30 = new Date(time.getTime() + 30 * 60000);
    const checkInTimePlus30Str = formatTimeHHMMSS(timePlus30);

    const schedule = await this.scheduleRepository
      .createQueryBuilder('schedule')
      .innerJoinAndSelect('schedule.classroomCourseTeacher', 'cct')
      .innerJoin(
        'enrollments',
        'enr',
        'enr.classroom_course_teacher_id = cct.id',
      )
      .where('enr.student_id = :studentId', { studentId })
      .andWhere('schedule.day_of_week = :dayOfWeek', { dayOfWeek })
      .andWhere('schedule.start_time <= :checkInTimePlus30', {
        checkInTimePlus30: checkInTimePlus30Str,
      })
      .andWhere('schedule.end_time >= :checkInTime', {
        checkInTime: checkInTimeStr,
      })
      .getOne();

    return schedule;
  }

  async getSchedulesFromTeacher(
    userId: string,
  ): Promise<TeacherScheduleResult[]> {
    try {
      const teacher = await this.teacherRepository.findOne({
        where: { userId },
      });

      if (!teacher) {
        throw new NotFoundException('Teacher not found for this user');
      }

      const schedules = await this.scheduleRepository
        .createQueryBuilder('schedule')
        .innerJoinAndSelect('schedule.classroomCourseTeacher', 'cct')
        .innerJoinAndSelect('cct.course', 'course')
        .innerJoinAndSelect('cct.classroom', 'classroom')
        .where('cct.teacher_id = :teacherId', { teacherId: teacher.id })
        .getMany();

      return schedules.map((schedule) => ({
        id: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        course: {
          id: schedule.classroomCourseTeacher.course.id,
          name: schedule.classroomCourseTeacher.course.name,
          code: schedule.classroomCourseTeacher.course.code,
        },
        classroom: {
          id: schedule.classroomCourseTeacher.classroom.id,
          name: schedule.classroomCourseTeacher.classroom.name,
          building: schedule.classroomCourseTeacher.classroom.building,
        },
      }));
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Failed to get schedules for user with id ${userId}`,
        error,
      );
      throw new InternalServerErrorException('Could not get schedules');
    }
  }
}

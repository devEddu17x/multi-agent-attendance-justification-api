import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleEntity } from '../entities/schedule.entity';
import { ClassroomCourseTeacherEntity } from '../entities/classroom-course-teacher.entity';
import { AcademicYearEntity } from '../entities/academic-year.entity';
import { CreateScheduleDto } from '../dto/create-schedule.dto';

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
  ) {}

  async create(dto: CreateScheduleDto): Promise<ScheduleEntity> {
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
}

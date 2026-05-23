import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnrollmentEntity } from '../entities/enrollment.entity';
import { StudentEntity } from '../../students/entities/student.entity';
import { ClassroomCourseTeacherEntity } from '../entities/classroom-course-teacher.entity';
import { CreateEnrollmentDTO } from '../dto/create-enrollment.dto';

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepository: Repository<EnrollmentEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepository: Repository<StudentEntity>,
    @InjectRepository(ClassroomCourseTeacherEntity)
    private readonly classroomCourseTeacherRepository: Repository<ClassroomCourseTeacherEntity>,
  ) {}

  async create(dto: CreateEnrollmentDTO): Promise<EnrollmentEntity> {
    try {
      const [student, classroomCourseTeacher] = await Promise.all([
        this.studentRepository.findOne({
          where: { id: dto.studentId },
        }),
        this.classroomCourseTeacherRepository.findOne({
          where: { id: dto.classroomCourseTeacherId },
        }),
      ]);

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      if (!student.isActive) {
        throw new NotFoundException('Student is not active');
      }

      if (!classroomCourseTeacher) {
        throw new NotFoundException('Classroom course teacher not found');
      }

      const enrollment = this.enrollmentRepository.create(dto);
      return await this.enrollmentRepository.save(enrollment);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Failed to create enrollment', error);
      throw new InternalServerErrorException('Could not create enrollment');
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      const enrollment = await this.enrollmentRepository.findOne({
        where: { id },
      });

      if (!enrollment) {
        throw new NotFoundException('Enrollment not found');
      }

      await this.enrollmentRepository.delete(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to delete enrollment with id ${id}`, error);
      throw new InternalServerErrorException('Could not delete enrollment');
    }
  }
}

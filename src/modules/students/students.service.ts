import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentEntity } from './entities/student.entity';
import { CreateStudentDTO } from './dto/create-student.dto';
import { UpdateStudentParentDTO } from './dto/update-student-parent.dto';
import { UpdateStudentClassroomDTO } from './dto/update-student-classroom.dto';
import { UpdateStudentActiveDTO } from './dto/update-student-active.dto';
import { UpdateStudentRekognitionDTO } from './dto/update-student-rekognition.dto';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @InjectRepository(StudentEntity)
    private readonly repository: Repository<StudentEntity>,
  ) {}

  async create(dto: CreateStudentDTO): Promise<StudentEntity> {
    try {
      const entity = this.repository.create(dto);
      return await this.repository.save(entity);
    } catch (error) {
      this.logger.error('Failed to create student', error);
      throw new InternalServerErrorException('Could not create student');
    }
  }

  async getAll(): Promise<StudentEntity[]> {
    try {
      return await this.repository.find({
        relations: {
          parent: true,
          baseClassroom: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to fetch students', error);
      throw new InternalServerErrorException('Could not fetch students');
    }
  }

  async getById(id: string): Promise<StudentEntity> {
    try {
      const entity = await this.repository.findOne({
        where: { id },
        relations: {
          parent: true,
          baseClassroom: true,
        },
      });

      if (!entity) {
        throw new NotFoundException('Student not found');
      }

      return entity;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to fetch student with id ${id}`, error);
      throw new InternalServerErrorException('Could not fetch student');
    }
  }

  async updateParent(
    id: string,
    dto: UpdateStudentParentDTO,
  ): Promise<StudentEntity> {
    try {
      const student = await this.getById(id);
      student.parentId = dto.parentId;
      return await this.repository.save(student);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Failed to update parent for student with id ${id}`,
        error,
      );
      throw new InternalServerErrorException('Could not update student parent');
    }
  }

  async updateClassroom(
    id: string,
    dto: UpdateStudentClassroomDTO,
  ): Promise<StudentEntity> {
    try {
      const student = await this.getById(id);
      student.baseClassroomId = dto.baseClassroomId;
      return await this.repository.save(student);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Failed to update classroom for student with id ${id}`,
        error,
      );
      throw new InternalServerErrorException(
        'Could not update student classroom',
      );
    }
  }

  async updateActive(
    id: string,
    dto: UpdateStudentActiveDTO,
  ): Promise<StudentEntity> {
    try {
      const student = await this.getById(id);
      student.isActive = dto.isActive;
      return await this.repository.save(student);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Failed to update active status for student with id ${id}`,
        error,
      );
      throw new InternalServerErrorException(
        'Could not update student active status',
      );
    }
  }

  async updateRekognition(
    id: string,
    dto: UpdateStudentRekognitionDTO,
  ): Promise<StudentEntity> {
    try {
      const student = await this.getById(id);
      student.rekognitionId = dto.rekognitionId;
      return await this.repository.save(student);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Failed to update rekognition for student with id ${id}`,
        error,
      );
      throw new InternalServerErrorException(
        'Could not update student rekognition',
      );
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      const student = await this.getById(id);

      if (student.isActive === false) {
        throw new ConflictException('Student is already inactive');
      }

      student.isActive = false;
      await this.repository.save(student);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      )
        throw error;
      this.logger.error(`Failed to delete student with id ${id}`, error);
      throw new InternalServerErrorException('Could not delete student');
    }
  }
  async reactivateById(id: string): Promise<void> {
    try {
      const student = await this.getById(id);

      if (student.isActive === true) {
        throw new ConflictException('Student is already active');
      }

      student.isActive = true;
      await this.repository.save(student);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      )
        throw error;
      this.logger.error(`Failed to reactivate student with id ${id}`, error);
      throw new InternalServerErrorException('Could not reactivate student');
    }
  }
}

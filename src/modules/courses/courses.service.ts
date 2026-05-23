import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseEntity } from './entities/course.entity';
import { CreateCourseDTO } from './dto/create-course.dto';
import { UpdateCourseDTO } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    @InjectRepository(CourseEntity)
    private readonly repository: Repository<CourseEntity>,
  ) {}

  async create(dto: CreateCourseDTO): Promise<CourseEntity> {
    try {
      const entity = this.repository.create(dto);
      return await this.repository.save(entity);
    } catch (error) {
      this.logger.error('Failed to create course', error);
      throw new InternalServerErrorException('Could not create course');
    }
  }

  async getAll(): Promise<CourseEntity[]> {
    try {
      return await this.repository.find();
    } catch (error) {
      this.logger.error('Failed to fetch courses', error);
      throw new InternalServerErrorException('Could not fetch courses');
    }
  }

  async getById(id: string): Promise<CourseEntity> {
    try {
      const entity = await this.repository.findOne({ where: { id } });
      if (!entity) {
        throw new NotFoundException('Course not found');
      }
      return entity;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to fetch course with id ${id}`, error);
      throw new InternalServerErrorException('Could not fetch course');
    }
  }

  async getByCode(code: string): Promise<CourseEntity> {
    try {
      const entity = await this.repository.findOne({ where: { code } });
      if (!entity) {
        throw new NotFoundException('Course not found');
      }
      return entity;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to fetch course with code ${code}`, error);
      throw new InternalServerErrorException('Could not fetch course');
    }
  }

  async updateById(id: string, dto: UpdateCourseDTO): Promise<CourseEntity> {
    try {
      const entity = await this.getById(id);
      Object.assign(entity, dto);
      return await this.repository.save(entity);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to update course with id ${id}`, error);
      throw new InternalServerErrorException('Could not update course');
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      const course = await this.repository.findOne({
        where: { id },
        relations: { teachers: true },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      if (course.teachers && course.teachers.length > 0) {
        throw new ConflictException(
          'Cannot delete course with existing teacher assignments',
        );
      }

      await this.repository.delete(id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      )
        throw error;
      this.logger.error(`Failed to delete course with id ${id}`, error);
      throw new InternalServerErrorException('Could not delete course');
    }
  }
}

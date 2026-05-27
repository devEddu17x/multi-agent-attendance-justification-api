import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateTeacherDTO } from './dto/update-teacher.dto';
import { TeacherEntity } from './entities/teacher.entity';
import { CreateTeacherDTO } from '../../common/dtos/create-teacher.dto';
import { UserService } from '../user/user.service';
import { UpdateUserDTO } from '../user/dto/update-user.dto';

@Injectable()
export class TeachersService {
  private readonly logger = new Logger(TeachersService.name);

  constructor(
    @InjectRepository(TeacherEntity)
    private readonly teacherRepository: Repository<TeacherEntity>,
    private readonly userService: UserService,
  ) {}

  async create(createTeacherDto: CreateTeacherDTO, userId: string) {
    try {
      const newTeacher = this.teacherRepository.create({
        ...createTeacherDto,
        user: { id: userId },
      });
      return await this.teacherRepository.save(newTeacher);
    } catch (error) {
      this.logger.error('Failed to create teacher', error);
      throw new InternalServerErrorException(
        'Failed to create teacher request. Please try again later.',
      );
    }
  }

  async getAll() {
    try {
      const teachers = await this.teacherRepository.find({
        relations: {
          user: true,
          teacherCourses: true,
        },
      });
      return teachers;
    } catch (error) {
      this.logger.error('Failed to fetch teachers', error);
      throw new InternalServerErrorException(
        'Failed to fetch records. Please try again later.',
      );
    }
  }

  async getById(id: string) {
    try {
      const teacher = await this.teacherRepository.findOne({
        where: { id },
        relations: {
          user: true,
          teacherCourses: true,
        },
      });

      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }
      return teacher;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to fetch teacher', error);
      throw new InternalServerErrorException(
        'Failed to fetch record. Please try again later.',
      );
    }
  }

  async updateById(id: string, dto: UpdateTeacherDTO) {
    try {
      const teacher = await this.getById(id);
      const updatePromises: Promise<any>[] = [];

      const updateUserDTO: UpdateUserDTO = {};

      if (dto.firstName) {
        updateUserDTO.firstName = dto.firstName;
        teacher.user.firstName = dto.firstName;
      }
      if (dto.lastName) {
        updateUserDTO.lastName = dto.lastName;
        teacher.user.lastName = dto.lastName;
      }

      if (Object.keys(updateUserDTO).length > 0) {
        updatePromises.push(
          this.userService.updateUser(teacher.userId, updateUserDTO),
        );
      }

      if (dto.phone) {
        teacher.phone = dto.phone;
        updatePromises.push(
          this.teacherRepository.update(id, { phone: dto.phone }),
        );
      }

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      return teacher;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to update teacher', error);
      throw new InternalServerErrorException(
        'Failed to update record. Please try again later.',
      );
    }
  }

  async deleteById(id: string) {
    try {
      const teacher = await this.getById(id);
      return await this.teacherRepository.remove(teacher);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to remove teacher', error);
      throw new InternalServerErrorException(
        'Failed to remove record. Please try again later.',
      );
    }
  }
}

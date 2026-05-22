import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassroomEntity } from './entities/classroom.entity';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';

@Injectable()
export class ClassroomService {
  private readonly logger = new Logger(ClassroomService.name);

  constructor(
    @InjectRepository(ClassroomEntity)
    private readonly repository: Repository<ClassroomEntity>,
  ) {}

  async create(dto: CreateClassroomDto): Promise<ClassroomEntity> {
    try {
      const entity = this.repository.create(dto);
      return await this.repository.save(entity);
    } catch {
      this.logger.error('Failed to create classroom');
      throw new InternalServerErrorException('Could not create classroom');
    }
  }

  async getAll(): Promise<ClassroomEntity[]> {
    try {
      return await this.repository.find();
    } catch {
      this.logger.error('Failed to fetch classrooms');
      throw new InternalServerErrorException('Could not fetch classrooms');
    }
  }

  async getById(id: string): Promise<ClassroomEntity> {
    try {
      const entity = await this.repository.findOne({ where: { id } });
      if (!entity) {
        throw new NotFoundException('Classroom not found');
      }
      return entity;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`Failed to fetch classroom with id ${id}`);
      throw new InternalServerErrorException('Could not fetch classroom');
    }
  }

  async updateById(
    id: string,
    dto: UpdateClassroomDto,
  ): Promise<ClassroomEntity> {
    try {
      const entity = await this.getById(id);
      Object.assign(entity, dto);
      return await this.repository.save(entity);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`Failed to update classroom with id ${id}`);
      throw new InternalServerErrorException('Could not update classroom');
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      const result = await this.repository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException('Classroom not found');
      }
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`Failed to delete classroom with id ${id}`);
      throw new InternalServerErrorException('Could not delete classroom');
    }
  }
}

import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateParentDto } from '../../common/dtos/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { ParentEntity } from './entities/parent.entity';
import { UserService } from '../user/user.service';
import { UpdateUserDTO } from '../user/dto/update-user.dto';

@Injectable()
export class ParentService {
  private readonly logger = new Logger(ParentService.name);

  constructor(
    @InjectRepository(ParentEntity)
    private readonly parentRepository: Repository<ParentEntity>,
    private readonly userService: UserService,
  ) {}

  async create(createParentDto: CreateParentDto) {
    try {
      const newParent = this.parentRepository.create(createParentDto);
      return await this.parentRepository.save(newParent);
    } catch (error) {
      this.logger.error('Failed to create parent', error);
      throw new InternalServerErrorException(
        'Failed to create parent request. Please try again later.',
      );
    }
  }

  async getAll() {
    try {
      const parents = await this.parentRepository.find({
        relations: {
          user: true,
        },
      });
      return parents;
    } catch (error) {
      this.logger.error('Failed to fetch parents', error);
      throw new InternalServerErrorException(
        'Failed to fetch records. Please try again later.',
      );
    }
  }

  async getById(id: string) {
    try {
      const parent = await this.parentRepository.findOne({
        where: { id },
        relations: {
          user: true,
        },
      });

      if (!parent) {
        throw new NotFoundException('Parent not found');
      }
      return parent;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to fetch parent', error);
      throw new InternalServerErrorException(
        'Failed to fetch record. Please try again later.',
      );
    }
  }

  async updateById(id: string, dto: UpdateParentDto) {
    try {
      const parent = await this.getById(id);
      const updatePromises: Promise<any>[] = [];

      const updateUserDTO: UpdateUserDTO = {};

      if (dto.firstName) {
        updateUserDTO.firstName = dto.firstName;
        parent.user.firstName = dto.firstName;
      }
      if (dto.lastName) {
        updateUserDTO.lastName = dto.lastName;
        parent.user.lastName = dto.lastName;
      }

      if (Object.keys(updateUserDTO).length > 0) {
        updatePromises.push(
          this.userService.updateUser(parent.userId, updateUserDTO),
        );
      }

      if (dto.phone) {
        parent.phone = dto.phone;
        updatePromises.push(
          this.parentRepository.update(id, { phone: dto.phone }),
        );
      }

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      return parent;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to update parent', error);
      throw new InternalServerErrorException(
        'Failed to update record. Please try again later.',
      );
    }
  }

  async deleteById(id: string) {
    try {
      const parent = await this.getById(id);
      return await this.parentRepository.remove(parent);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to remove parent', error);
      throw new InternalServerErrorException(
        'Failed to remove record. Please try again later.',
      );
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDTO } from './dto/create-user.dto';
import { UpdateUserDTO } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async createUser(
    dto: CreateUserDTO,
    explicitId?: string,
  ): Promise<UserEntity> {
    const user = this.userRepository.create(dto);
    if (explicitId) {
      user.id = explicitId;
    }
    return this.userRepository.save(user);
  }

  async updateUser(id: string, dto: UpdateUserDTO): Promise<UserEntity> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }
}

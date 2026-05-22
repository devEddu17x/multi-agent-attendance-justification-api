import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParentService } from './parent.service';
import { ParentController } from './parent.controller';
import { ParentEntity } from './entities/parent.entity';
import { UserEntity } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ParentEntity])],
  controllers: [ParentController],
  providers: [UserService, ParentService],
})
export class ParentModule {}

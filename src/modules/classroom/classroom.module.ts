import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassroomEntity } from './entities/classroom.entity';
import { ClassroomService } from './classroom.service';
import { ClassroomController } from './classroom.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClassroomEntity])],
  controllers: [ClassroomController],
  providers: [ClassroomService],
})
export class ClassroomModule {}

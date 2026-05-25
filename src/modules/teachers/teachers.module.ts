import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherEntity } from './entities/teacher.entity';
import { TeacherCourseEntity } from './entities/teacher-course.entity';
import { UserEntity } from '../user/entities/user.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([UserEntity, TeacherEntity, TeacherCourseEntity]),
  ],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}

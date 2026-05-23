import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleEntity } from './entities/schedule.entity';
import { ClassroomCourseTeacherEntity } from './entities/classroom-course-teacher.entity';
import { AcademicYearEntity } from './entities/academic-year.entity';
import { AcademicClassesService } from './academic-classes.service';
import { AcademicClassesController } from './academic-classes.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScheduleEntity,
      ClassroomCourseTeacherEntity,
      AcademicYearEntity,
    ]),
  ],
  controllers: [AcademicClassesController],
  providers: [AcademicClassesService],
})
export class AcademicClassesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleEntity } from './entities/schedule.entity';
import { ClassroomCourseTeacherEntity } from './entities/classroom-course-teacher.entity';
import { AcademicYearEntity } from './entities/academic-year.entity';
import { EnrollmentEntity } from './entities/enrollment.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ScheduleService } from './services/schedule.service';
import { EnrollmentService } from './services/enrollment.service';
import { AcademicClassesController } from './academic-classes.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScheduleEntity,
      ClassroomCourseTeacherEntity,
      AcademicYearEntity,
      EnrollmentEntity,
      StudentEntity,
    ]),
  ],
  controllers: [AcademicClassesController],
  providers: [ScheduleService, EnrollmentService],
})
export class AcademicClassesModule {}

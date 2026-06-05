import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleEntity } from './entities/schedule.entity';
import { ClassroomCourseTeacherEntity } from './entities/classroom-course-teacher.entity';
import { AcademicYearEntity } from './entities/academic-year.entity';
import { EnrollmentEntity } from './entities/enrollment.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { TeacherEntity } from '../teachers/entities/teacher.entity';
import { CourseEntity } from '../courses/entities/course.entity';
import { ClassroomEntity } from '../classroom/entities/classroom.entity';
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
      TeacherEntity,
      CourseEntity,
      ClassroomEntity,
    ]),
  ],
  controllers: [AcademicClassesController],
  providers: [ScheduleService, EnrollmentService],
  exports: [ScheduleService],
})
export class AcademicClassesModule {}

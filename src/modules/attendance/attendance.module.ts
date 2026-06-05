import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './services/attendance.service';
import { RekognitionService } from './services/rekognition.service';
import { AttendanceEntity } from './entities/attendance.entity';
import { AttendanceJustificationEntity } from './entities/attendance-justification.entity';
import { ParentEntity } from '../parents/entities/parent.entity';
import { TeacherEntity } from '../teachers/entities/teacher.entity';
import { ScheduleEntity } from '../academic-classes/entities/schedule.entity';
import { EnrollmentEntity } from '../academic-classes/entities/enrollment.entity';
import { StudentsModule } from '../students/students.module';
import { AcademicClassesModule } from '../academic-classes/academic-classes.module';

@Module({
  imports: [
    StudentsModule,
    AcademicClassesModule,
    TypeOrmModule.forFeature([
      AttendanceEntity,
      AttendanceJustificationEntity,
      ParentEntity,
      TeacherEntity,
      ScheduleEntity,
      EnrollmentEntity,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, RekognitionService],
})
export class AttendanceModule {}

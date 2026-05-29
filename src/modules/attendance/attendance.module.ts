import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './services/attendance.service';
import { RekognitionService } from './services/rekognition.service';
import { AttendanceEntity } from './entities/attendance.entity';
import { AttendanceJustificationEntity } from './entities/attendance-justification.entity';
import { StudentsModule } from '../students/students.module';
import { AcademicClassesModule } from '../academic-classes/academic-classes.module';

@Module({
  imports: [
    AttendanceModule,
    StudentsModule,
    AcademicClassesModule,
    TypeOrmModule.forFeature([AttendanceEntity, AttendanceJustificationEntity]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, RekognitionService],
})
export class AttendanceModule {}

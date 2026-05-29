import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './core/config/config.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { ParentModule } from './modules/parents/parent.module';
import { ClassroomModule } from './modules/classroom/classroom.module';
import { CoursesModule } from './modules/courses/courses.module';
import { AcademicClassesModule } from './modules/academic-classes/academic-classes.module';
import { StudentsModule } from './modules/students/students.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { UserModule } from './modules/user/user.module';
import { AttendanceModule } from './modules/attendance/attendance.module';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    TeachersModule,
    ParentModule,
    ClassroomModule,
    CoursesModule,
    AcademicClassesModule,
    StudentsModule,
    AuthModule,
    AdminModule,
    AttendanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

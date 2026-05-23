import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './core/config/config.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { ParentModule } from './modules/parents/parent.module';
import { ClassroomModule } from './modules/classroom/classroom.module';
import { CoursesModule } from './modules/courses/courses.module';
import { AcademicClassesModule } from './modules/academic-classes/academic-classes.module';

@Module({
  imports: [
    ConfigModule,
    TeachersModule,
    ParentModule,
    ClassroomModule,
    CoursesModule,
    AcademicClassesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

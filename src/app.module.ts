import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './core/config/config.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { ParentModule } from './modules/parents/parent.module';
import { ClassroomModule } from './modules/classroom/classroom.module';

@Module({
  imports: [ConfigModule, TeachersModule, ParentModule, ClassroomModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

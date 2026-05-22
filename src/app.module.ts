import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './core/config/config.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { ParentModule } from './modules/parents/parent.module';

@Module({
  imports: [ConfigModule, TeachersModule, ParentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

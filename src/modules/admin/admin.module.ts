import { Module } from '@nestjs/common';
import { AdministrationService } from './admin.service';
import { AdministrationController } from './admin.controller';
import { UserModule } from '../user/user.module';
import { TeachersModule } from '../teachers/teachers.module';
import { AuthModule } from '../auth/auth.module';
import { ParentModule } from '../parents/parent.module';

@Module({
  imports: [AuthModule, UserModule, TeachersModule, ParentModule],
  providers: [AdministrationService],
  controllers: [AdministrationController],
})
export class AdminModule {}

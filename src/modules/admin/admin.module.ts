import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UserModule } from '../user/user.module';
import { TeachersModule } from '../teachers/teachers.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, UserModule, TeachersModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}

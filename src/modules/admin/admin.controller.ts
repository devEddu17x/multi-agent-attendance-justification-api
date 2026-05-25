import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateTeacherDTO } from 'src/common/dtos/create-teacher.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from 'src/common/enums/roles.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles(ROLES.ADMIN)
  @Post('teacher')
  async createTeacher(@Body() dto: CreateTeacherDTO) {
    return this.adminService.createTeacher(dto);
  }
}

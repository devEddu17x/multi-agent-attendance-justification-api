import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdministrationService } from './admin.service';
import { CreateTeacherDTO } from 'src/common/dtos/create-teacher.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from 'src/common/enums/roles.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiDocCreateTeacher, ApiDocCreateParent } from './docs/admin.doc';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('administration')
export class AdministrationController {
  constructor(private readonly adminService: AdministrationService) {}

  @Roles(ROLES.ADMIN)
  @Post('teacher')
  @ApiDocCreateTeacher()
  async createTeacher(@Body() dto: CreateTeacherDTO) {
    return this.adminService.createTeacher(dto);
  }

  @Roles(ROLES.TEACHER)
  @Post('parent')
  @ApiDocCreateParent()
  async createParent(@Body() dto: CreateTeacherDTO) {
    return this.adminService.createTeacher(dto);
  }
}

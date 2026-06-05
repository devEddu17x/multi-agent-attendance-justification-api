import {
  Controller,
  Post,
  Body,
  Delete,
  Param,
  ParseUUIDPipe,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ScheduleService } from './services/schedule.service';
import { EnrollmentService } from './services/enrollment.service';
import { CreateScheduleDTO } from './dto/create-schedule.dto';
import { CreateEnrollmentDTO } from './dto/create-enrollment.dto';
import type { User } from 'src/common/interfaces/user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from 'src/common/enums/roles.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AcademicClassesController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  @Roles(ROLES.TEACHER)
  @Get('schedule/teacher')
  async getTeacherSchedules(@CurrentUser() user: User) {
    return await this.scheduleService.getSchedulesFromTeacher(user.sub);
  }

  @Roles(ROLES.ADMIN)
  @Post('schedule')
  createSchedule(@Body() dto: CreateScheduleDTO) {
    return this.scheduleService.create(dto);
  }

  @Roles(ROLES.ADMIN)
  @Delete('schedule/:id')
  deleteScheduleById(@Param('id', ParseUUIDPipe) id: string) {
    return this.scheduleService.deleteById(id);
  }

  @Roles(ROLES.ADMIN)
  @Post('enrollment')
  createEnrollment(@Body() dto: CreateEnrollmentDTO) {
    return this.enrollmentService.create(dto);
  }

  @Roles(ROLES.ADMIN)
  @Delete('enrollment/:id')
  deleteEnrollmentById(@Param('id', ParseUUIDPipe) id: string) {
    return this.enrollmentService.deleteById(id);
  }
}

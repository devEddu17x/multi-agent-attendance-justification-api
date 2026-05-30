import {
  Controller,
  Post,
  Body,
  Delete,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ScheduleService } from './services/schedule.service';
import { EnrollmentService } from './services/enrollment.service';
import { CreateScheduleDTO } from './dto/create-schedule.dto';
import { CreateEnrollmentDTO } from './dto/create-enrollment.dto';

@Controller()
export class AcademicClassesController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  @Post('schedule')
  createSchedule(@Body() dto: CreateScheduleDTO) {
    return this.scheduleService.create(dto);
  }

  @Delete('schedule/:id')
  deleteScheduleById(@Param('id', ParseUUIDPipe) id: string) {
    return this.scheduleService.deleteById(id);
  }

  @Post('enrollment')
  createEnrollment(@Body() dto: CreateEnrollmentDTO) {
    return this.enrollmentService.create(dto);
  }

  @Delete('enrollment/:id')
  deleteEnrollmentById(@Param('id', ParseUUIDPipe) id: string) {
    return this.enrollmentService.deleteById(id);
  }
}

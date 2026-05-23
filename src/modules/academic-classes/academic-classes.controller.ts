import {
  Controller,
  Post,
  Body,
  Delete,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AcademicClassesService } from './academic-classes.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';

@Controller('schedule')
export class AcademicClassesController {
  constructor(private readonly service: AcademicClassesService) {}

  @Post()
  create(@Body() dto: CreateScheduleDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  deleteById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteById(id);
  }
}

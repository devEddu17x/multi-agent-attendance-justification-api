import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDTO } from './dto/create-course.dto';
import { UpdateCourseDTO } from './dto/update-course.dto';
import {
  ApiDocGetAllCourses,
  ApiDocGetCourseById,
  ApiDocGetCourseByCode,
} from './docs/courses.doc';

@Controller('courses')
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  @Post()
  create(@Body() dto: CreateCourseDTO) {
    return this.service.create(dto);
  }

  @Get()
  @ApiDocGetAllCourses()
  getAll() {
    return this.service.getAll();
  }

  @Get(':id')
  @ApiDocGetCourseById()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Get('code/:code')
  @ApiDocGetCourseByCode()
  getByCode(@Param('code') code: string) {
    return this.service.getByCode(code);
  }

  @Patch(':id')
  updateById(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDTO,
  ) {
    return this.service.updateById(id, dto);
  }

  @Delete(':id')
  deleteById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteById(id);
  }
}

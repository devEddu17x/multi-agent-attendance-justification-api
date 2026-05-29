import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { UpdateTeacherDTO } from './dto/update-teacher.dto';
import { ApiDocGetAllTeachers } from './docs/teachers.doc';
import { ApiDocGetTeacherById } from './docs/teachers.doc';

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @ApiDocGetAllTeachers()
  getAll() {
    return this.teachersService.getAll();
  }

  @Get(':id')
  @ApiDocGetTeacherById()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.teachersService.getById(id);
  }

  @Patch(':id')
  updateById(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTeacherDto: UpdateTeacherDTO,
  ) {
    return this.teachersService.updateById(id, updateTeacherDto);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.teachersService.deleteById(id);
  }
}

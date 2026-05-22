import { Controller, Get, Body, Patch, Param, Delete } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { UpdateTeacherDTO } from './dto/update-teacher.dto';

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  getAll() {
    return this.teachersService.getAll();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.teachersService.getById(id);
  }

  @Patch(':id')
  updateById(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDTO,
  ) {
    return this.teachersService.updateById(id, updateTeacherDto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.teachersService.delete(id);
  }
}

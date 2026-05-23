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
import { StudentsService } from './students.service';
import { CreateStudentDTO } from './dto/create-student.dto';
import { UpdateStudentParentDTO } from './dto/update-student-parent.dto';
import { UpdateStudentClassroomDTO } from './dto/update-student-classroom.dto';
import { UpdateStudentActiveDTO } from './dto/update-student-active.dto';
import { UpdateStudentRekognitionDTO } from './dto/update-student-rekognition.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Post()
  create(@Body() dto: CreateStudentDTO) {
    return this.service.create(dto);
  }

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Patch(':id/parent')
  updateParent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentParentDTO,
  ) {
    return this.service.updateParent(id, dto);
  }

  @Patch(':id/classroom')
  updateClassroom(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentClassroomDTO,
  ) {
    return this.service.updateClassroom(id, dto);
  }

  @Patch(':id/active')
  updateActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentActiveDTO,
  ) {
    return this.service.updateActive(id, dto);
  }

  @Patch(':id/rekognition')
  updateRekognition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentRekognitionDTO,
  ) {
    return this.service.updateRekognition(id, dto);
  }

  @Delete(':id')
  deleteById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteById(id);
  }

  @Patch(':id/reactivate')
  reactivateById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.reactivateById(id);
  }
}

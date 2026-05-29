import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDTO } from './dto/create-student.dto';
import { UpdateStudentParentDTO } from './dto/update-student-parent.dto';
import { UpdateStudentClassroomDTO } from './dto/update-student-classroom.dto';
import { UpdateStudentActiveDTO } from './dto/update-student-active.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from 'src/common/enums/roles.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'src/common/interfaces/user.interface';
import {
  ApiDocCreateStudent,
  ApiDocGetOwnStudents,
  ApiDocGetAllStudents,
  ApiDocGetStudentById,
} from './docs/students.doc';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Roles(ROLES.ADMIN, ROLES.TEACHER)
  @Post()
  @ApiDocCreateStudent()
  create(@Body() dto: CreateStudentDTO) {
    return this.service.create(dto);
  }

  @Get('own')
  @ApiDocGetOwnStudents()
  getOwn(@CurrentUser() user: User) {
    return this.service.getStudentsByParentEmail(user.email);
  }

  @Roles(ROLES.ADMIN, ROLES.TEACHER)
  @Get()
  @ApiDocGetAllStudents()
  getAll() {
    return this.service.getAll();
  }

  @Roles(ROLES.ADMIN, ROLES.TEACHER)
  @Get(':id')
  @ApiDocGetStudentById()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Roles(ROLES.ADMIN, ROLES.TEACHER)
  @Patch(':id/parent')
  updateParent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentParentDTO,
  ) {
    return this.service.updateParent(id, dto);
  }

  @Roles(ROLES.ADMIN, ROLES.TEACHER)
  @Patch(':id/classroom')
  updateClassroom(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentClassroomDTO,
  ) {
    return this.service.updateClassroom(id, dto);
  }

  @Roles(ROLES.ADMIN, ROLES.TEACHER)
  @Patch(':id/active')
  updateActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentActiveDTO,
  ) {
    return this.service.updateActive(id, dto);
  }

  @Roles(ROLES.ADMIN, ROLES.TEACHER)
  @Delete(':id')
  deleteById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteById(id);
  }

  @Roles(ROLES.ADMIN, ROLES.TEACHER)
  @Patch(':id/reactivate')
  reactivateById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.reactivateById(id);
  }
}

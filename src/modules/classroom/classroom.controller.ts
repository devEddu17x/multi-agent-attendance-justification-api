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
import { ClassroomService } from './classroom.service';
import { CreateClassroomDTO } from './dto/create-classroom.dto';
import { UpdateClassroomDTO } from './dto/update-classroom.dto';
import {
  ApiDocGetAllClassrooms,
  ApiDocGetClassroomById,
} from './docs/classroom.doc';

@Controller('classroom')
export class ClassroomController {
  constructor(private readonly service: ClassroomService) {}

  @Post()
  create(@Body() dto: CreateClassroomDTO) {
    return this.service.create(dto);
  }

  @Get()
  @ApiDocGetAllClassrooms()
  getAll() {
    return this.service.getAll();
  }

  @Get(':id')
  @ApiDocGetClassroomById()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  updateById(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClassroomDTO,
  ) {
    return this.service.updateById(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteById(id);
  }
}

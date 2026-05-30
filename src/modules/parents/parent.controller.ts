import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ParentService } from './parent.service';
import { UpdateParentDTO } from './dto/update-parent.dto';
import { ApiDocGetAllParents, ApiDocGetParentById } from './docs/parents.doc';

@Controller('parents')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Get()
  @ApiDocGetAllParents()
  getAll() {
    return this.parentService.getAll();
  }

  @Get(':id')
  @ApiDocGetParentById()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.parentService.getById(id);
  }

  @Patch(':id')
  updateById(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateParentDto: UpdateParentDTO,
  ) {
    return this.parentService.updateById(id, updateParentDto);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.parentService.deleteById(id);
  }
}

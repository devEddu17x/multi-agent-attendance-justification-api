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
import { UpdateParentDto } from './dto/update-parent.dto';

@Controller('parents')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Get()
  getAll() {
    return this.parentService.getAll();
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.parentService.getById(id);
  }

  @Patch(':id')
  updateById(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateParentDto: UpdateParentDto,
  ) {
    return this.parentService.updateById(id, updateParentDto);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.parentService.deleteById(id);
  }
}

import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocGetAllClassrooms() {
  return applyDecorators(ApiOperation({ summary: 'Get all classrooms' }));
}

export function ApiDocGetClassroomById() {
  return applyDecorators(ApiOperation({ summary: 'Get classroom by id' }));
}

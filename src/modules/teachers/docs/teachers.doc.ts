import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocGetAllTeachers() {
  return applyDecorators(ApiOperation({ summary: 'Get all teachers' }));
}

export function ApiDocGetTeacherById() {
  return applyDecorators(ApiOperation({ summary: 'Get teacher by id ' }));
}

import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocCreateTeacher() {
  return applyDecorators(ApiOperation({ summary: 'Create a teacher' }));
}

export function ApiDocCreateParent() {
  return applyDecorators(ApiOperation({ summary: 'Create a parent' }));
}

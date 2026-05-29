import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocGetAllParents() {
  return applyDecorators(ApiOperation({ summary: 'Get all parents' }));
}

export function ApiDocGetParentById() {
  return applyDecorators(ApiOperation({ summary: 'Get parent by id' }));
}

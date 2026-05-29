import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocGetAllCourses() {
  return applyDecorators(ApiOperation({ summary: 'Get all courses' }));
}

export function ApiDocGetCourseById() {
  return applyDecorators(ApiOperation({ summary: 'Get course by id' }));
}

export function ApiDocGetCourseByCode() {
  return applyDecorators(ApiOperation({ summary: 'Get course by code' }));
}

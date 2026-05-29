import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocCreateStudent() {
  return applyDecorators(ApiOperation({ summary: 'Create a new student' }));
}

export function ApiDocGetOwnStudents() {
  return applyDecorators(ApiOperation({ summary: 'Get own students' }));
}

export function ApiDocGetAllStudents() {
  return applyDecorators(ApiOperation({ summary: 'Get all students' }));
}

export function ApiDocGetStudentById() {
  return applyDecorators(ApiOperation({ summary: 'Get student by id' }));
}

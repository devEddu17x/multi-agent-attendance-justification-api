import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

export function ApiDocCreateTeacher() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create a teacher',
      description:
        'Creates a new teacher in AWS Cognito and the database. Role: admin only.',
    }),
  );
}

export function ApiDocCreateParent() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create a parent',
      description:
        'Creates a new parent in AWS Cognito and the database. Role: teacher only.',
    }),
  );
}

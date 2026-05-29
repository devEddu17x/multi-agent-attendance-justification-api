import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocLogin() {
  return applyDecorators(
    ApiOperation({
      summary: 'Sign in',
      description:
        'Authenticates a user via AWS Cognito and returns JWT tokens. Use the accessToken in the Authorize dialog (Bearer <accessToken>) to call protected endpoints.',
    }),
  );
}

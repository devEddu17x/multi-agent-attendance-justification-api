import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

export function ApiDocChat() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Chat with Justification Agent',
      description:
        'Sends a message to the justification agent and receives a response. Role: teacher only.',
    }),
  );
}

export function ApiDocGetPresignedUrls() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get presigned URLs',
      description:
        'Retrieves presigned URLs for file uploads. Role: teacher only.',
    }),
  );
}

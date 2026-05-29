import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

export function ApiDocRegisterStudentFace() {
  return applyDecorators(
    ApiOperation({
      summary: 'Register student face for attendance',
      description:
        'Uploads a student photo to AWS Rekognition for facial recognition. The face ID is stored on the student record for future attendance checks.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiParam({
      name: 'id',
      description: 'Student UUID',
      type: 'string',
      format: 'uuid',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['photo'],
        properties: {
          photo: {
            type: 'string',
            format: 'binary',
            description:
              'Student face photo. Max 150 KB. Allowed formats: JPEG, JPG, PNG.',
          },
        },
      },
    }),
  );
}

export function ApiDocRegisterAttendance() {
  return applyDecorators(
    ApiOperation({
      summary: 'Register attendance via facial recognition',
      description:
        'Searches the uploaded photo against registered faces in AWS Rekognition. Matches the recognized student to their current schedule and records attendance. Grace period: 0 minutes after schedule start time before marked as late.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiQuery({
      name: 'time',
      required: false,
      description:
        'Simulated datetime (ISO string) for testing. If omitted, current server time is used.',
      type: 'string',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['photo'],
        properties: {
          photo: {
            type: 'string',
            format: 'binary',
            description:
              'Photo to search for face match. Max 50 KB. Allowed formats: JPEG, JPG, PNG.',
          },
        },
      },
    }),
  );
}

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateStudentDTO {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, {
    message: 'The field documentNumber must contain exactly 8 digits',
  })
  documentNumber: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsUUID()
  @IsOptional()
  baseClassroomId?: string;

  @IsUUID()
  @IsNotEmpty()
  rekognitionId: string;
}

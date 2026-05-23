import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UpdateStudentRekognitionDTO {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  rekognitionId: string;
}

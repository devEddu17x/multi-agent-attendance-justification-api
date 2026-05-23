import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UpdateStudentParentDTO {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  parentId: string;
}

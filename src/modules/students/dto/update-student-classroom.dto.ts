import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateStudentClassroomDTO {
  @IsNotEmpty()
  @IsUUID()
  baseClassroomId: string;
}

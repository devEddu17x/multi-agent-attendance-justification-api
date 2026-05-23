import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateEnrollmentDTO {
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @IsUUID()
  @IsNotEmpty()
  classroomCourseTeacherId: string;
}

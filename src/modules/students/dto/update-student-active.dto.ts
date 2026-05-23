import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateStudentActiveDTO {
  @IsNotEmpty()
  @IsBoolean()
  isActive: boolean;
}

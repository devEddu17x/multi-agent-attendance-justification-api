import { IsInt, Min, Max, IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateClassroomDto {
  @IsInt()
  @Min(1)
  @Max(64)
  capacity: number;

  @IsString()
  @IsNotEmpty()
  building: string;

  @IsNotEmpty()
  @IsUUID()
  tutorId?: string;
}

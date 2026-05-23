import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { DayOfWeek } from '../../../common/enums/day-of-week.enum';

export class CreateScheduleDto {
  @IsUUID()
  @IsNotEmpty()
  teacherId: string;

  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @IsUUID()
  @IsNotEmpty()
  classroomId: string;

  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  dayOfWeek: DayOfWeek;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;
}

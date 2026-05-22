import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateClassroomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @IsInt()
  @Min(1)
  @Max(64)
  capacity: number;

  @IsString()
  @IsNotEmpty()
  building: string;

  @IsUUID()
  @IsOptional()
  tutorId?: string;
}

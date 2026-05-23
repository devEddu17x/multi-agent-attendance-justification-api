import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCourseDTO {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  code: string;
}

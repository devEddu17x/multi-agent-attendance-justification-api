import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateTeacherDTO {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^9\d{8}$/, {
    message: 'The field phone must have exactly 9 digits and start with 9',
  })
  phone?: string;
}

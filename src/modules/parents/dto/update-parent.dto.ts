import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateParentDto {
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
    message: 'phone must have exactly 9 digits and start with 9',
  })
  phone?: string;
}

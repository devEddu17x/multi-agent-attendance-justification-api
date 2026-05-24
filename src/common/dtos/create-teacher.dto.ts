import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  IsStrongPassword,
} from 'class-validator';

export class CreateTeacherDTO {
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, {
    message: 'The field documentNumber must contain exactly 8 digits',
  })
  documentNumber: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^9\d{8}$/, {
    message: 'The field phone must have exactly 9 digits and start with 9',
  })
  phone: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsNotEmpty()
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minNumbers: 1,
      minSymbols: 1,
      minUppercase: 1,
    },
    {
      message:
        'The field password does not meet security policies (minimum 8 characters, at least 1 lowercase, 1 uppercase, 1 number, and 1 symbol)',
    },
  )
  password: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;
}

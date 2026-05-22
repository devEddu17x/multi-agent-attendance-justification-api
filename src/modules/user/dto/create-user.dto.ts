import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateUserDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(64)
  email: string;
}

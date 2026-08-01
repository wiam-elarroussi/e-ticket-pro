import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginCustomerDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

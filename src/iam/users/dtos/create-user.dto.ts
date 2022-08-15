import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  readonly email: string;

  @IsNotEmpty()
  readonly password: string;

  readonly policies?: string[];
}

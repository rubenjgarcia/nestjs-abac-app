import { IsEmail, IsNotEmpty } from 'class-validator';

export class RecoverPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  readonly email: string;
}

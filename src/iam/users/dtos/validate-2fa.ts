import { MinLength, MaxLength } from 'class-validator';

export class Validate2FADto {
  @MinLength(6)
  @MaxLength(6)
  readonly token: string;
}

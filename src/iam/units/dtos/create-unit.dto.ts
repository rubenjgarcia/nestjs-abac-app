import { IsNotEmpty } from 'class-validator';

export class CreateUnitDto {
  @IsNotEmpty()
  readonly name: string;
}

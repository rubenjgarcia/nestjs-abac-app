import { IsNotEmpty } from 'class-validator';

export class UpdateUnitDto {
  @IsNotEmpty()
  readonly name: string;
}

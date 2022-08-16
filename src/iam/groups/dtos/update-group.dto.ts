import { IsNotEmpty } from 'class-validator';

export class UpdateGroupDto {
  @IsNotEmpty()
  readonly name: string;

  readonly policies?: string[];
}

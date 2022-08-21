import { IsNotEmpty } from 'class-validator';

export class UpdateRoleDto {
  @IsNotEmpty()
  readonly name: string;

  readonly policies?: string[];
}

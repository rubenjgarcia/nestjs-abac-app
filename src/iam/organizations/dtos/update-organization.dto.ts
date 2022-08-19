import { IsNotEmpty } from 'class-validator';

export class UpdateOrganizationDto {
  @IsNotEmpty()
  readonly name: string;
}

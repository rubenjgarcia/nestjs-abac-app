import { IsNotEmpty } from 'class-validator';

export class CreateOrganizationDto {
  @IsNotEmpty()
  readonly name: string;
}

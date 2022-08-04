import { IsNotEmpty, ArrayNotEmpty, IsEnum } from 'class-validator';
import { Effect } from '../../factories/casl-ability.factory';

export class UpdatePolicyDto {
  @IsNotEmpty()
  readonly name: string;

  @IsEnum(Effect, { message: "effect should be 'Allow' or 'Deny'" })
  readonly effect: Effect;

  @ArrayNotEmpty()
  @IsNotEmpty({ each: true })
  readonly actions: string[];

  @ArrayNotEmpty()
  @IsNotEmpty({ each: true })
  readonly resources: string[];
}

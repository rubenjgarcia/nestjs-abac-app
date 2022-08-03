import { Effect } from 'src/auth/factories/casl-ability.factory';
export class CreatePolicyDto {
  readonly name: string;

  readonly effect: Effect;

  readonly actions: string[];

  readonly resources: string[];
}

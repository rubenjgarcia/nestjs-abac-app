import { Effect } from '../../schemas/policy.schema';

export class UpdatePolicyDto {
  readonly name: string;

  readonly effect: Effect;

  readonly actions: string[];

  readonly resources: string[];
}

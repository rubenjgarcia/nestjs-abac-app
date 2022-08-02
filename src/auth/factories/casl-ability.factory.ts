import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { Ability, AbilityBuilder } from '@casl/ability';
import { User } from '../schemas/user.schema';
import { Effect } from '../schemas/policy.schema';

@Injectable()
export class CaslAbilityFactory {
  private readonly logger = new Logger(CaslAbilityFactory.name);

  createForUser(user: User) {
    const { can, cannot, build } = new AbilityBuilder(Ability);

    user.policies &&
      user.policies.forEach((p) => {
        p.actions.forEach((a) => {
          try {
            const subject = a.split(':')[0];
            const action = a.split(':')[1];
            const condition = p.resources.includes('*')
              ? undefined
              : { _id: { $in: p.resources.map((r) => new Types.ObjectId(r)) } };
            if (p.effect === Effect.Allow) {
              can(action, subject, condition);
            } else {
              cannot(action, subject, condition);
            }
          } catch (e) {
            this.logger.error('Error creating policy', e.stack);
          }
        });
      });

    return build();
  }
}

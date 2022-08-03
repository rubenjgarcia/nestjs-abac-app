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
            let subject;
            let action;

            if (a === '*') {
              subject = 'all';
              action = 'manage';
            } else if (a.includes(':')) {
              const split = a.split(':');
              subject = split[0];
              action = split[1];
              if (subject === 'all') {
                this.logger.error(
                  "Error creating policy: 'all' is a reserved keyword",
                );
                return;
              } else if (subject === '*') {
                subject = 'all';
              }

              if (action === 'manage') {
                this.logger.error(
                  "Error creating policy: 'manage' is a reserved keyword",
                );
                return;
              } else if (action === '*') {
                action = 'manage';
              }
            } else {
              this.logger.error('Error creating policy: Malfomed action');
              return;
            }
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

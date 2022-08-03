import { Injectable, Logger } from '@nestjs/common';
import { Ability, AbilityBuilder } from '@casl/ability';

export enum Effect {
  Allow = 'Allow',
  Deny = 'Deny',
}
export interface AbilityPolicy {
  name: string;

  effect: Effect;

  actions: string[];

  resources: string[];
}

export interface WithPolicies {
  policies?: AbilityPolicy[];
}

@Injectable()
export class CaslAbilityFactory {
  private readonly logger = new Logger(CaslAbilityFactory.name);

  createWithPolicies(withPolicies: WithPolicies) {
    const { can: allow, cannot: deny, build } = new AbilityBuilder(Ability);

    withPolicies.policies &&
      withPolicies.policies.forEach((p) => {
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
              : { _id: { $in: p.resources } };
            if (p.effect === Effect.Allow) {
              allow(action, subject, condition);
            } else {
              deny(action, subject, condition);
            }
          } catch (e) {
            this.logger.error('Error creating policy', e.stack);
          }
        });
      });

    return build();
  }
}

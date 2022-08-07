import { Injectable, Logger } from '@nestjs/common';
import {
  Ability,
  AbilityBuilder,
  MongoQuery,
  buildMongoQueryMatcher,
} from '@casl/ability';
import { $and, and } from '@ucast/mongo2js';

export enum Effect {
  Allow = 'Allow',
  Deny = 'Deny',
}

export type StringOperator = 'StringEquals' | 'StringNotEquals';
export type NumberOperator =
  | 'NumberEquals'
  | 'NumberNotEquals'
  | 'NumberLessThan'
  | 'NumberLessThanEquals'
  | 'NumberGreaterThan'
  | 'NumberGreaterThanEquals';
type BooleanOperator = 'Bool';

type Operator = StringOperator | NumberOperator | BooleanOperator;

type OneOperatorKey<K extends Operator, V = any> = {
  [P in K]: Record<P, V> & Partial<Record<Exclude<K, P>, never>> extends infer O
    ? { [Q in keyof O]: O[Q] }
    : never;
}[K];

type OneStringKey<K extends string, V = any> = {
  [P in K]: Record<P, V> & Partial<Record<Exclude<K, P>, never>> extends infer O
    ? { [Q in keyof O]: O[Q] }
    : never;
}[K];

type StringSingleValue = OneStringKey<string, string | number | boolean>;

export type Condition = OneOperatorKey<Operator, StringSingleValue>;

export interface AbilityPolicy {
  name: string;

  effect: Effect;

  actions: string[];

  resources: string[];

  condition?: Condition;
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

            let condition: MongoQuery = p.resources.includes('*')
              ? undefined
              : { _id: { $in: p.resources } };
            if (p.condition) {
              const operator = Object.keys(p.condition)[0] as Operator;
              const field = Object.keys(p.condition[operator])[0];
              const value = Object.values(p.condition[operator])[0];
              let policyCondition;

              switch (operator) {
                case 'StringEquals':
                case 'NumberEquals':
                case 'Bool':
                  policyCondition = {
                    [field]: {
                      $eq: value,
                    },
                  };
                  break;
                case 'StringNotEquals':
                case 'NumberNotEquals':
                  policyCondition = {
                    [field]: {
                      $ne: value,
                    },
                  };
                  break;
                case 'NumberLessThan':
                  policyCondition = {
                    $and: [
                      {
                        [field]: { $exists: true },
                      },
                      { [field]: { $lt: value } },
                    ],
                  };
                  break;
                case 'NumberLessThanEquals':
                  policyCondition = {
                    $and: [
                      {
                        [field]: { $exists: true },
                      },
                      { [field]: { $lte: value } },
                    ],
                  };
                  break;
                case 'NumberGreaterThan':
                  policyCondition = {
                    [field]: {
                      $gt: value,
                    },
                  };
                  break;
                case 'NumberGreaterThanEquals':
                  policyCondition = {
                    [field]: {
                      $gte: value,
                    },
                  };
                  break;
                default:
                  policyCondition = {};
              }
              condition = { ...condition, ...policyCondition };
            }

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

    return build({
      conditionsMatcher: buildMongoQueryMatcher({ $and }, { and }),
    });
  }
}

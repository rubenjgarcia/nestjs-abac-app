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

type OneStringKey<K extends string, V = any> = {
  [P in K]: Record<P, V> & Partial<Record<Exclude<K, P>, never>> extends infer O
    ? { [Q in keyof O]: O[Q] }
    : never;
}[K];

type OneStringOperatorKey<
  K extends StringOperator,
  V = OneStringKey<string, any>,
> = {
  [P in K]: Record<P, V> & Partial<Record<Exclude<K, P>, never>> extends infer O
    ? { [Q in keyof O]: O[Q] }
    : never;
}[K];

type OneNumberOperatorKey<K extends NumberOperator, V = number> = {
  [P in K]: Record<P, V> & Partial<Record<Exclude<K, P>, never>> extends infer O
    ? { [Q in keyof O]: O[Q] }
    : never;
}[K];

type OneBooleanOperatorKey<K extends BooleanOperator, V = boolean> = {
  [P in K]: Record<P, V> & Partial<Record<Exclude<K, P>, never>> extends infer O
    ? { [Q in keyof O]: O[Q] }
    : never;
}[K];

type StringSingleValue = OneStringKey<string, string>;
type NumberSingleValue = OneStringKey<string, number>;
type BooleanSingleValue = OneStringKey<string, boolean>;

export type Condition =
  | OneStringOperatorKey<StringOperator, StringSingleValue>
  | OneNumberOperatorKey<NumberOperator, NumberSingleValue>
  | OneBooleanOperatorKey<BooleanOperator, BooleanSingleValue>;

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

type PolicyConditionType =
  | 'Equals'
  | 'NotEquals'
  | 'LessThan'
  | 'LessThanEquals'
  | 'GreaterThan'
  | 'GreaterThanEquals';

const createPolicyCondition = (
  type: PolicyConditionType,
  field: string,
  value: string | number | boolean,
) => {
  switch (type) {
    case 'Equals':
      return {
        [field]: {
          $eq: value,
        },
      };
    case 'NotEquals':
      return {
        [field]: {
          $ne: value,
        },
      };
    case 'LessThan':
      return {
        $and: [
          {
            [field]: { $exists: true },
          },
          { [field]: { $lt: value } },
        ],
      };
    case 'LessThanEquals':
      return {
        $and: [
          {
            [field]: { $exists: true },
          },
          { [field]: { $lte: value } },
        ],
      };
    case 'GreaterThan':
      return {
        [field]: {
          $gt: value,
        },
      };
    case 'GreaterThanEquals':
      return {
        [field]: {
          $gte: value,
        },
      };
  }
};

@Injectable()
export class CaslAbilityFactory {
  private readonly logger = new Logger(CaslAbilityFactory.name);

  createWithPolicies(withPolicies: WithPolicies) {
    const { can: allow, cannot: deny, build } = new AbilityBuilder(Ability);

    withPolicies.policies &&
      withPolicies.policies.forEach((p) => {
        p.actions.forEach((a) => {
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

          let conditions: MongoQuery = p.resources.includes('*')
            ? undefined
            : { _id: { $in: p.resources } };
          if (p.condition) {
            const operator = Object.keys(p.condition)[0];
            let condition;
            let policyCondition;

            switch (operator) {
              case 'StringEquals':
              case 'StringNotEquals':
                condition = p.condition as OneStringOperatorKey<
                  StringOperator,
                  StringSingleValue
                >;
                policyCondition = createPolicyCondition(
                  operator.replace('String', '') as PolicyConditionType,
                  Object.keys(condition[operator])[0],
                  Object.values(condition[operator])[0],
                );
                break;
              case 'NumberEquals':
              case 'NumberNotEquals':
              case 'NumberLessThan':
              case 'NumberLessThanEquals':
              case 'NumberGreaterThan':
              case 'NumberGreaterThanEquals':
                condition = p.condition as OneNumberOperatorKey<
                  NumberOperator,
                  NumberSingleValue
                >;
                policyCondition = createPolicyCondition(
                  operator.replace('Number', '') as PolicyConditionType,
                  Object.keys(condition[operator])[0],
                  Object.values(condition[operator])[0],
                );
                break;
              case 'Bool':
                condition = p.condition as OneBooleanOperatorKey<
                  BooleanOperator,
                  BooleanSingleValue
                >;
                policyCondition = createPolicyCondition(
                  'Equals',
                  Object.keys(condition[operator])[0],
                  Object.values(condition[operator])[0],
                );
                break;
            }
            conditions = { ...conditions, ...policyCondition };
          }

          if (p.effect === Effect.Allow) {
            allow(action, subject, conditions);
          } else {
            deny(action, subject, conditions);
          }
        });
      });

    return build({
      conditionsMatcher: buildMongoQueryMatcher({ $and }, { and }),
    });
  }
}

import { Test } from '@nestjs/testing';
import { subject } from '@casl/ability';
import {
  CaslAbilityFactory,
  Effect,
  WithPolicies,
} from './casl-ability.factory';

describe('CASL Ability', () => {
  let caslAbilityFactory: CaslAbilityFactory;
  class Foo {
    _id: string;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CaslAbilityFactory],
    }).compile();

    await module.init();

    caslAbilityFactory = module.get<CaslAbilityFactory>(CaslAbilityFactory);
  });

  describe('User with no policies', () => {
    it('should not have ability when the policy has no policy', () => {
      const abilities = caslAbilityFactory.createWithPolicies({});
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });
  });

  describe('User with Allow effect policies', () => {
    it('should not have ability when the policy has another service in policy', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should not have ability when the policy has another action in policy', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action2'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should have ability when the policy has wildcard in resource', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(true);
    });

    it('should have ability when the policy has wildcard in the actions and wildcard in resource', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(true);
      expect(abilities.can('Action', subject('Foo', { foo: 1 }))).toBe(true);
      expect(abilities.can('Action2', subject('Bar', {}))).toBe(true);
      expect(abilities.can('Action2', subject('Bar', { foo: 1 }))).toBe(true);
    });

    it('should not have ability when the policy has resource informed', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should have ability when the policy has resource informed and the resource _id is the same', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      const foo: Foo = { _id: '000000000001' };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(true);
    });

    it('should have ability when the policy has resource wildcard and the resource _id is informed', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      const foo: Foo = { _id: '000000000001' };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(true);
    });

    it('should not have ability when the policy has resource informed and the resource _id is not the same', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      const foo: Foo = { _id: '000000000002' };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);
    });
  });

  describe('User with Deny effect policies', () => {
    it('should not have ability when the policy has resource wildcard', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should not have ability when the policy has resource wildcard and the resource _id is informed', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      const foo: Foo = { _id: '000000000001' };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);
    });

    it('should not have ability when the policy has resource wildcard and the resource _id is the same', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      const foo: Foo = { _id: '000000000001' };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);
    });

    it('should not have ability when the policy has resource wildcard and the resource _id is different', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      const foo: Foo = { _id: '000000000002' };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);
    });
  });

  describe('User with Allow and Deny effect policies', () => {
    it('should not have ability when the Allow policy has resource wildcard and Deny policy has resource wildcard', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
          {
            name: 'BarPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should not have ability when the Allow policy has resource informed and Deny policy has resource informed', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
          {
            name: 'BarPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should not have ability when the Allow and Deny policy has resource informed and the resource _id is the same', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
          {
            name: 'BarPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      const foo: Foo = { _id: '000000000001' };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);
    });

    it('should have ability when the Allow policy has one resource informed and Deny policy has other resource informed and the resource _id is the same that the Allow policy has', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
          {
            name: 'BarPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000002'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      const foo: Foo = { _id: '000000000001' };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(true);
    });

    it('should not have ability when the Allow policy has one resource informed and Deny policy has other resource informed and the resource _id is the same that the Deny policy has', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
          {
            name: 'BarPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000002'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      const foo: Foo = { _id: '000000000002' };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);
    });

    it('should have ability when the Allow policy has resource wildcard and Deny policy has resource informed and the resource _id is the different that the Deny policy has', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
          {
            name: 'BarPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000002'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      const foo: Foo = { _id: '000000000001' };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(true);
    });

    it('should not have ability when the Allow policy has resource wildcard and Deny policy has resource informed and the resource _id is the same that the Deny policy has', () => {
      let withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
          {
            name: 'BarPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000002'],
          },
        ],
      };
      let abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      const foo: Foo = { _id: '000000000002' };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);

      withPolicies = {
        policies: [
          {
            name: 'DenyPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
          {
            name: 'AllowPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
          },
        ],
      };
      abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);
    });
  });

  describe('User with Allow effect and wildcard actions', () => {
    it('should have ability when the policy has wildcard in action policy', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(true);
    });

    it('should have ability when the policy has wildcard in action policy for the action', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:*'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(true);
      expect(abilities.can('Action', subject('Bar', {}))).toBe(false);
    });

    it('should have ability when the policy has wildcard in action policy for the subject', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(true);
      expect(abilities.can('Action2', subject('Foo', {}))).toBe(false);
      expect(abilities.can('Action', subject('Bar', {}))).toBe(true);
    });
  });

  describe('User with Allow and Deny effect and wildcard actions', () => {
    it('should not have ability when has a policy with Allow in effect, wildcard in actions and wildcard in resources but has other policy with Deny in effect and wildcard in actions and wildcard in resources', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
          },
          {
            name: 'BarPolicy',
            effect: Effect.Deny,
            actions: ['*'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should not have ability when has a policy with Allow in effect, wildcard in actions and wildcard in resources but has other policy with Deny in effect and wildcard in resources', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
          },
          {
            name: 'BarPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should not have ability when has a policy with Allow in effect, wildcard in action of the subject and wildcard in resources but has other policy with Deny in effect, wildcard in action of the subject and wildcard in resources', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:*'],
            resources: ['*'],
          },
          {
            name: 'BarPolicy',
            effect: Effect.Deny,
            actions: ['Foo:*'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should not have ability when has a policy with Allow in effect, wildcard in action for the subject and wildcard in resources but has another policy with Deny in effect, wildcard in action for the subject and wildcard in resources', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*:Action'],
            resources: ['*'],
          },
          {
            name: 'BarPolicy',
            effect: Effect.Deny,
            actions: ['*:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
      expect(abilities.can('Action', subject('Bar', {}))).toBe(false);
      expect(abilities.can('Action2', subject('Foo', {}))).toBe(false);
    });
  });

  describe('Malformed policies', () => {
    it('should ignore a malformed action in policy', () => {
      const withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['FooAction'],
            resources: ['000000000000'],
          },
        ],
      };

      const abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.rules.length).toBe(0);
    });

    it('should ignore policy with keywords in action', () => {
      let withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['all:manage'],
            resources: ['000000000000'],
          },
        ],
      };

      let abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.rules.length).toBe(0);

      withPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:manage'],
            resources: ['000000000000'],
          },
        ],
      };

      abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.rules.length).toBe(0);

      withPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['all:Action'],
            resources: ['000000000000'],
          },
        ],
      };

      abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.rules.length).toBe(0);
    });
  });

  describe('Conditions', () => {
    it('should be capable of have conditions based on string fields', () => {
      let withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
            condition: { StringEquals: { foo: 'bar' } },
          },
        ],
      };

      let abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: 'bar' }))).toBe(
        true,
      );
      expect(abilities.can('Action', subject('Foo', { foo: 'barz' }))).toBe(
        false,
      );

      withPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
            condition: { StringNotEquals: { foo: 'bar' } },
          },
        ],
      };

      abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(true);
      expect(abilities.can('Action', subject('Foo', { foo: 'bar' }))).toBe(
        false,
      );
      expect(abilities.can('Action', subject('Foo', { foo: 'barz' }))).toBe(
        true,
      );
    });

    it('should be capable of have conditions based on numeric fields', () => {
      let withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
            condition: { NumberEquals: { foo: 1 } },
          },
        ],
      };

      let abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: 1 }))).toBe(true);
      expect(abilities.can('Action', subject('Foo', { foo: 2 }))).toBe(false);

      withPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
            condition: { NumberNotEquals: { foo: 1 } },
          },
        ],
      };

      abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(true);
      expect(abilities.can('Action', subject('Foo', { foo: 1 }))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: 2 }))).toBe(true);

      withPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
            condition: { NumberGreaterThan: { foo: 1 } },
          },
        ],
      };

      abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: 0 }))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: 1 }))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: 2 }))).toBe(true);

      withPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
            condition: { NumberGreaterThanEquals: { foo: 1 } },
          },
        ],
      };

      abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: 0 }))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: 1 }))).toBe(true);
      expect(abilities.can('Action', subject('Foo', { foo: 2 }))).toBe(true);

      withPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
            condition: { NumberLessThan: { foo: 1 } },
          },
        ],
      };

      abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: 2 }))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: 1 }))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: 0 }))).toBe(true);

      withPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
            condition: { NumberLessThanEquals: { foo: 1 } },
          },
        ],
      };

      abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: 2 }))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: 1 }))).toBe(true);
      expect(abilities.can('Action', subject('Foo', { foo: 0 }))).toBe(true);
    });

    it('should be capable of have conditions based on boolean fields', () => {
      let withPolicies: WithPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
            condition: { Bool: { foo: true } },
          },
        ],
      };

      let abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: true }))).toBe(true);
      expect(abilities.can('Action', subject('Foo', { foo: false }))).toBe(
        false,
      );

      withPolicies = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
            condition: { Bool: { foo: false } },
          },
        ],
      };

      abilities = caslAbilityFactory.createWithPolicies(withPolicies);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
      expect(abilities.can('Action', subject('Foo', { foo: true }))).toBe(
        false,
      );
      expect(abilities.can('Action', subject('Foo', { foo: false }))).toBe(
        true,
      );
    });
  });
});

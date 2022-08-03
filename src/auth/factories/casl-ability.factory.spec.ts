import { Types } from 'mongoose';
import { Test } from '@nestjs/testing';
import { subject } from '@casl/ability';
import { User } from '../schemas/user.schema';
import { CaslAbilityFactory } from './casl-ability.factory';
import { Effect } from '../schemas/policy.schema';

describe('CASL Ability', () => {
  let caslAbilityFactory: CaslAbilityFactory;
  class Foo {
    _id: Types.ObjectId;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CaslAbilityFactory],
    }).compile();

    await module.init();

    caslAbilityFactory = module.get<CaslAbilityFactory>(CaslAbilityFactory);
  });

  describe('User with no policies', () => {
    it('should not have ability when the user has no policy', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
      };
      const abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });
  });

  describe('User with Allow policies', () => {
    it('should not have ability when the user has another service in policy', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should not have ability when the user has another action in policy', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action2'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should have ability when the policy has wildcard in resource', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(true);
    });

    it('should not have ability when the policy has resource informed', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should have ability when the policy has resource informed and the resource _id is the same', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      const foo: Foo = { _id: new Types.ObjectId('000000000001') };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(true);
    });

    it('should have ability when the policy has resource wildcard and the resource _id is informed', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      const foo: Foo = { _id: new Types.ObjectId('000000000001') };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(true);
    });

    it('should not have ability when the policy has resource informed and the resource _id is not the same', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      const foo: Foo = { _id: new Types.ObjectId('000000000002') };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);
    });
  });

  describe('User with Deny policies', () => {
    it('should not have ability when the policy has resource wildcard', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should not have ability when the policy has resource wildcard and the resource _id is informed', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      const foo: Foo = { _id: new Types.ObjectId('000000000001') };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);
    });

    it('should not have ability when the policy has resource wildcard and the resource _id is the same', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      const foo: Foo = { _id: new Types.ObjectId('000000000001') };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);
    });

    it('should not have ability when the policy has resource wildcard and the resource _id is different', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      const foo: Foo = { _id: new Types.ObjectId('000000000002') };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);
    });
  });

  describe('User with Allow and Deny policies', () => {
    it('should not have ability when the Allow policy has resource wildcard and Deny policy has resource wildcard', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
          {
            _id: new Types.ObjectId('000000000001'),
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should not have ability when the Allow policy has resource informed and Deny policy has resource informed', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
          {
            _id: new Types.ObjectId('000000000001'),
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(false);
    });

    it('should not have ability when the Allow and Deny policy has resource informed and the resource _id is the same', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
          {
            _id: new Types.ObjectId('000000000001'),
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      const foo: Foo = { _id: new Types.ObjectId('000000000001') };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);
    });

    it('should have ability when the Allow policy has one resource informed and Deny policy has other resource informed and the resource _id is the same that the Allow policy has', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
          {
            _id: new Types.ObjectId('000000000001'),
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000002'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      const foo: Foo = { _id: new Types.ObjectId('000000000001') };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(true);
    });

    it('should not have ability when the Allow policy has one resource informed and Deny policy has other resource informed and the resource _id is the same that the Deny policy has', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['000000000001'],
          },
          {
            _id: new Types.ObjectId('000000000001'),
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000002'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      const foo: Foo = { _id: new Types.ObjectId('000000000002') };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);
    });

    it('should have ability when the Allow policy has resource wildcard and Deny policy has resource informed and the resource _id is the different that the Deny policy has', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
          {
            _id: new Types.ObjectId('000000000001'),
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000002'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      const foo: Foo = { _id: new Types.ObjectId('000000000001') };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(true);
    });

    it('should not have ability when the Allow policy has resource wildcard and Deny policy has resource informed and the resource _id is the same that the Deny policy has', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
          {
            _id: new Types.ObjectId('000000000001'),
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: ['Foo:Action'],
            resources: ['000000000002'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      const foo: Foo = { _id: new Types.ObjectId('000000000002') };
      expect(abilities.can('Action', subject('Foo', foo))).toBe(false);
    });
  });

  describe('User with wildcard actions', () => {
    it('should have ability when the user has wildcard in action policy', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(true);
    });

    it('should have ability when the user has wildcard in action policy for the action', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:*'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(true);
      expect(abilities.can('Action', subject('Bar', {}))).toBe(false);
    });

    it('should have ability when the user has wildcard in action policy for the subject', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['*:Action'],
            resources: ['*'],
          },
        ],
      };
      const abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.can('Action', subject('Foo', {}))).toBe(true);
      expect(abilities.can('Action2', subject('Foo', {}))).toBe(false);
      expect(abilities.can('Action', subject('Bar', {}))).toBe(true);
    });
  });

  describe('Malformed policies', () => {
    it('should ignore a malformed id from a policy', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['1'],
          },
        ],
      };

      const abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.rules.length).toBe(0);
    });

    it('should ignore a malformed action in policy', () => {
      const user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['FooAction'],
            resources: ['000000000000'],
          },
        ],
      };

      const abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.rules.length).toBe(0);
    });

    it('should ignore policy with keywords in action', () => {
      let user: User = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['all:manage'],
            resources: ['000000000000'],
          },
        ],
      };

      let abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.rules.length).toBe(0);

      user = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:manage'],
            resources: ['000000000000'],
          },
        ],
      };

      abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.rules.length).toBe(0);

      user = {
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['all:Action'],
            resources: ['000000000000'],
          },
        ],
      };

      abilities = caslAbilityFactory.createForUser(user);
      expect(abilities.rules.length).toBe(0);
    });
  });
});

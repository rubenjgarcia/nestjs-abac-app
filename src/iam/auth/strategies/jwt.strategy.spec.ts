import { when } from 'jest-when';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Effect } from '../../../framework/factories/casl-ability.factory';
import { UserService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JWT Strategy', () => {
  let jwtStrategy: JwtStrategy;
  const sub = new Types.ObjectId('000000000000').toString();

  beforeAll(async () => {
    const findOneWithPolicies = jest.fn();
    when(findOneWithPolicies)
      .calledWith('withGroupsAndPolicies@example.com')
      .mockResolvedValue({
        _id: new Types.ObjectId('000000000000'),
        email: 'withGroups@example.com',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
        ],
        groups: [
          {
            name: 'FooGroup',
            policies: [
              {
                _id: new Types.ObjectId('000000000001'),
                name: 'BarPolicy',
                effect: Effect.Allow,
                actions: ['Bar:Action'],
                resources: ['*'],
              },
            ],
          },
        ],
      })
      .calledWith('withGroups@example.com')
      .mockResolvedValue({
        _id: new Types.ObjectId('000000000000'),
        email: 'withGroups@example.com',
        groups: [
          {
            name: 'FooGroup',
            policies: [
              {
                _id: new Types.ObjectId('000000000001'),
                name: 'BarPolicy',
                effect: Effect.Allow,
                actions: ['Bar:Action'],
                resources: ['*'],
              },
            ],
          },
        ],
      })
      .calledWith('withGroupsWithoutPolicies@example.com')
      .mockResolvedValue({
        _id: new Types.ObjectId('000000000000'),
        email: 'withGroups@example.com',
        groups: [
          {
            name: 'FooGroup',
          },
        ],
      })
      .calledWith('withPolicies@example.com')
      .mockResolvedValue({
        _id: new Types.ObjectId('000000000000'),
        email: 'withPolicies@example.com',
        policies: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
          },
        ],
      })
      .calledWith('withoutGroupOrPolicies@example.com')
      .mockResolvedValue({
        _id: new Types.ObjectId('000000000000'),
        email: 'withoutGroupOrPolicies@example.com',
      });

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockResolvedValue('foo'),
          },
        },
        {
          provide: UserService,
          useValue: { findOneWithPolicies },
        },
        JwtStrategy,
      ],
    }).compile();

    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('should create payload for user if the user has groups and policies', async () => {
      const payload = await jwtStrategy.validate({
        email: 'withGroupsAndPolicies@example.com',
        sub,
      });

      expect(payload.userId).toBe(sub);
      expect(payload.email).toBe('withGroupsAndPolicies@example.com');
      expect(payload.policies.length).toBe(2);
      expect(payload.policies[0].name).toBe('FooPolicy');
      expect(payload.policies[0].effect).toBe(Effect.Allow);
      expect(payload.policies[0].actions[0]).toBe('Foo:Action');
      expect(payload.policies[0].resources[0]).toBe('*');
      expect(payload.policies[1].name).toBe('BarPolicy');
      expect(payload.policies[1].effect).toBe(Effect.Allow);
      expect(payload.policies[1].actions[0]).toBe('Bar:Action');
      expect(payload.policies[1].resources[0]).toBe('*');
    });

    it('should create payload for user if the user has policies', async () => {
      const payload = await jwtStrategy.validate({
        email: 'withPolicies@example.com',
        sub,
      });

      expect(payload.userId).toBe(sub);
      expect(payload.email).toBe('withPolicies@example.com');
      expect(payload.policies.length).toBe(1);
      expect(payload.policies[0].name).toBe('FooPolicy');
      expect(payload.policies[0].effect).toBe(Effect.Allow);
      expect(payload.policies[0].actions[0]).toBe('Foo:Action');
      expect(payload.policies[0].resources[0]).toBe('*');
    });

    it('should create payload for user if the user has groups', async () => {
      const payload = await jwtStrategy.validate({
        email: 'withGroups@example.com',
        sub,
      });

      expect(payload.userId).toBe(sub);
      expect(payload.email).toBe('withGroups@example.com');
      expect(payload.policies.length).toBe(1);
      expect(payload.policies[0].name).toBe('BarPolicy');
      expect(payload.policies[0].effect).toBe(Effect.Allow);
      expect(payload.policies[0].actions[0]).toBe('Bar:Action');
      expect(payload.policies[0].resources[0]).toBe('*');
    });

    it('should create payload for user if the user has groups without policies in them', async () => {
      const payload = await jwtStrategy.validate({
        email: 'withGroupsWithoutPolicies@example.com',
        sub,
      });

      expect(payload.userId).toBe(sub);
      expect(payload.email).toBe('withGroupsWithoutPolicies@example.com');
      expect(payload.policies.length).toBe(0);
    });

    it('should create payload for user if the user has no policies or groups', async () => {
      const payload = await jwtStrategy.validate({
        email: 'withoutGroupOrPolicies@example.com',
        sub,
      });

      expect(payload.userId).toBe(sub);
      expect(payload.email).toBe('withoutGroupOrPolicies@example.com');
      expect(payload.policies.length).toBe(0);
    });
  });
});

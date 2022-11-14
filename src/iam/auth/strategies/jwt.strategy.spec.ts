import { when } from 'jest-when';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Effect } from '../../../framework/factories/casl-ability.factory';
import { UserService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';
import { Unit } from '../../units/units.schema';
import { Organization } from '../../organizations/organizations.schema';

describe('JWT Strategy', () => {
  let jwtStrategy: JwtStrategy;
  const sub = new Types.ObjectId('000000000000').toString();

  const organization: Organization = {
    _id: new Types.ObjectId('000000000000'),
    name: 'FooOrganization',
  };
  const unit: Unit = {
    _id: new Types.ObjectId('000000000000'),
    name: 'FooUnit',
    organization,
  };

  const roleOrganization: Organization = {
    _id: new Types.ObjectId('000000000001'),
    name: 'BarOrganization',
  };
  const roleUnit: Unit = {
    _id: new Types.ObjectId('000000000001'),
    name: 'BarUnit',
    organization: roleOrganization,
  };

  beforeAll(async () => {
    const policies = [
      {
        _id: new Types.ObjectId('000000000000'),
        name: 'FooPolicy',
        effect: Effect.Allow,
        actions: ['Foo:Action'],
        resources: ['*'],
      },
    ];
    const groupPolicies = [
      {
        _id: new Types.ObjectId('000000000001'),
        name: 'BarPolicy',
        effect: Effect.Allow,
        actions: ['Bar:Action'],
        resources: ['*'],
      },
    ];
    const rolePolicies = [
      {
        _id: new Types.ObjectId('000000000002'),
        name: 'WeePolicy',
        effect: Effect.Allow,
        actions: ['Wee:Action'],
        resources: ['*'],
      },
    ];
    const findOneWithPolicies = jest.fn();
    when(findOneWithPolicies)
      .calledWith('withGroupsAndPolicies@example.com')
      .mockResolvedValue({
        _id: new Types.ObjectId('000000000000'),
        email: 'withGroups@example.com',
        unit,
        policies,
        groups: [
          {
            name: 'FooGroup',
            policies: groupPolicies,
          },
        ],
      })
      .calledWith('withGroups@example.com')
      .mockResolvedValue({
        _id: new Types.ObjectId('000000000000'),
        email: 'withGroups@example.com',
        unit,
        groups: [
          {
            name: 'FooGroup',
            policies: groupPolicies,
          },
        ],
      })
      .calledWith('withGroupsWithoutPolicies@example.com')
      .mockResolvedValue({
        _id: new Types.ObjectId('000000000000'),
        email: 'withGroupsWithoutPolicies@example.com',
        unit,
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
        unit,
        policies,
      })
      .calledWith('withoutGroupOrPolicies@example.com')
      .mockResolvedValue({
        _id: new Types.ObjectId('000000000000'),
        email: 'withoutGroupOrPolicies@example.com',
        unit,
      })
      .calledWith('withRolesWithPolicies@example.com')
      .mockResolvedValue({
        _id: new Types.ObjectId('000000000000'),
        email: 'withRolesWithPolicies@example.com',
        unit,
        roles: [
          {
            _id: new Types.ObjectId('000000000000'),
            name: 'FooRole',
            policies: rolePolicies,
            unit: roleUnit,
          },
        ],
      })
      .calledWith('with2FA@example.com')
      .mockResolvedValue({
        _id: new Types.ObjectId('000000000000'),
        email: 'with2FA@example.com',
        unit,
        policies,
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
        unitId: unit._id.toString(),
        organizationId: organization._id.toString(),
        twoFactorAuthentication: false,
      });

      expect(payload.userId).toBe(sub);
      expect(payload.email).toBe('withGroupsAndPolicies@example.com');
      expect(payload.unitId).toBe(unit._id.toString());
      expect(payload.organizationId).toBe(organization._id.toString());
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
        unitId: unit._id.toString(),
        organizationId: organization._id.toString(),
        twoFactorAuthentication: false,
      });

      expect(payload.userId).toBe(sub);
      expect(payload.email).toBe('withPolicies@example.com');
      expect(payload.unitId).toBe(unit._id.toString());
      expect(payload.organizationId).toBe(organization._id.toString());
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
        unitId: unit._id.toString(),
        organizationId: organization._id.toString(),
        twoFactorAuthentication: false,
      });

      expect(payload.userId).toBe(sub);
      expect(payload.email).toBe('withGroups@example.com');
      expect(payload.unitId).toBe(unit._id.toString());
      expect(payload.organizationId).toBe(organization._id.toString());
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
        unitId: unit._id.toString(),
        organizationId: organization._id.toString(),
        twoFactorAuthentication: false,
      });

      expect(payload.userId).toBe(sub);
      expect(payload.email).toBe('withGroupsWithoutPolicies@example.com');
      expect(payload.unitId).toBe(unit._id.toString());
      expect(payload.organizationId).toBe(organization._id.toString());
      expect(payload.policies.length).toBe(0);
    });

    it('should create payload for user if the user has no policies or groups', async () => {
      const payload = await jwtStrategy.validate({
        email: 'withoutGroupOrPolicies@example.com',
        sub,
        unitId: unit._id.toString(),
        organizationId: organization._id.toString(),
        twoFactorAuthentication: false,
      });

      expect(payload.userId).toBe(sub);
      expect(payload.email).toBe('withoutGroupOrPolicies@example.com');
      expect(payload.unitId).toBe(unit._id.toString());
      expect(payload.organizationId).toBe(organization._id.toString());
      expect(payload.policies.length).toBe(0);
    });

    it('should create payload for user if the user has roles', async () => {
      const payload = await jwtStrategy.validate({
        email: 'withRolesWithPolicies@example.com',
        sub,
        unitId: unit._id.toString(),
        organizationId: organization._id.toString(),
        roles: ['000000000000'],
        twoFactorAuthentication: false,
      });

      expect(payload.userId).toBe(sub);
      expect(payload.email).toBe('withRolesWithPolicies@example.com');
      expect(payload.unitId).toBe(unit._id.toString());
      expect(payload.organizationId).toBe(organization._id.toString());
      expect(payload.roles.length).toBe(1);
      expect(payload.roles[0]).toBe('000000000000');
      expect(payload.policies.length).toBe(0);
    });

    it('should create payload for user if the user is assuming a role', async () => {
      const payload = await jwtStrategy.validate({
        email: 'withRolesWithPolicies@example.com',
        sub,
        unitId: unit._id.toString(),
        organizationId: organization._id.toString(),
        roles: [new Types.ObjectId('000000000000').toString()],
        roleId: new Types.ObjectId('000000000000').toString(),
        twoFactorAuthentication: false,
      });

      expect(payload.userId).toBe(sub);
      expect(payload.email).toBe('withRolesWithPolicies@example.com');
      expect(payload.unitId).toBe(roleUnit._id.toString());
      expect(payload.organizationId).toBe(roleOrganization._id.toString());
      expect(payload.roles.length).toBe(1);
      expect(payload.roles[0]).toBe(
        new Types.ObjectId('000000000000').toString(),
      );
      expect(payload.policies.length).toBe(1);
      expect(payload.policies[0].name).toBe('WeePolicy');
      expect(payload.policies[0].effect).toBe(Effect.Allow);
      expect(payload.policies[0].actions[0]).toBe('Wee:Action');
      expect(payload.policies[0].resources[0]).toBe('*');
    });

    it('should create payload for user if the user has 2FA validated', async () => {
      const payload = await jwtStrategy.validate({
        email: 'with2FA@example.com',
        sub,
        unitId: unit._id.toString(),
        organizationId: organization._id.toString(),
        twoFactorAuthentication: true,
        isSecondFactorAuthenticated: true,
      });

      expect(payload.userId).toBe(sub);
      expect(payload.email).toBe('with2FA@example.com');
      expect(payload.unitId).toBe(unit._id.toString());
      expect(payload.organizationId).toBe(organization._id.toString());
      expect(payload.policies.length).toBe(1);
      expect(payload.policies[0].name).toBe('FooPolicy');
      expect(payload.policies[0].effect).toBe(Effect.Allow);
      expect(payload.policies[0].actions[0]).toBe('Foo:Action');
      expect(payload.policies[0].resources[0]).toBe('*');
      expect(payload.policies[0].resources[0]).toBe('*');
    });

    it('should fail if the user has no 2FA validated', async () => {
      const payload = await jwtStrategy.validate({
        email: 'with2FA@example.com',
        sub,
        unitId: unit._id.toString(),
        organizationId: organization._id.toString(),
        twoFactorAuthentication: true,
      });

      expect(payload).toBeUndefined();
    });
  });
});

import * as bcrypt from 'bcrypt';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Connection, connect, Model, Types } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { authenticator } from 'otplib';
import { UserService } from './users.service';
import { User, UserSchema } from './users.schema';
import { Policy, PolicySchema } from '../policies/policies.schema';
import {
  CaslAbilityFactory,
  Effect,
} from '../../framework/factories/casl-ability.factory';
import {
  CreateUser,
  GetUser,
  ListUsers,
  UpdateUser,
  UserScope,
  RemoveUser,
  AddGroupToUser,
  Activate2FA,
} from './users.actions';
import { Group, GroupSchema } from '../groups/groups.schema';
import { Unit, UnitSchema } from '../units/units.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organizations/organizations.schema';
import { Role, RoleSchema } from '../roles/roles.schema';
import { TwoFAService } from '../auth/2fa.service';
import { EventsService } from 'src/framework/events/events';
import { UserCreatedEvent } from './user.events';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { when } from 'jest-when';

describe('UserService', () => {
  let userService: UserService;
  let eventsService: EventsService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let userModel: Model<User>;
  let policyModel: Model<Policy>;
  let groupModel: Model<Group>;
  let unitModel: Model<Unit>;
  let organizationModel: Model<Organization>;
  let roleModel: Model<Role>;

  let organization: Organization;
  let unit: Unit;
  let user: User;
  let userBar: User;
  let policy: Policy;

  jest.mock('src/framework/events/events');

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    userModel = mongoConnection.model(User.name, UserSchema);
    policyModel = mongoConnection.model(Policy.name, PolicySchema);
    groupModel = mongoConnection.model(Group.name, GroupSchema);
    unitModel = mongoConnection.model(Unit.name, UnitSchema);
    organizationModel = mongoConnection.model(
      Organization.name,
      OrganizationSchema,
    );
    roleModel = mongoConnection.model(Role.name, RoleSchema);

    const getConfig = jest.fn();
    when(getConfig)
      .calledWith('RECOVERY_TOKEN_TIME', expect.any(Number))
      .mockResolvedValue(24)
      .defaultResolvedValue('FOO');
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        UserService,
        CaslAbilityFactory,
        TwoFAService,
        EventsService,
        { provide: getModelToken(User.name), useValue: userModel },
        {
          provide: getModelToken(Policy.name),
          useValue: policyModel,
        },
        {
          provide: getModelToken(Group.name),
          useValue: groupModel,
        },
        {
          provide: ConfigService,
          useValue: {
            get: getConfig,
          },
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    eventsService = module.get<EventsService>(EventsService);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    organization = await new organizationModel({
      _id: new Types.ObjectId('000000000000'),
      name: 'FooOrganization',
    }).save();
    unit = await new unitModel({
      _id: new Types.ObjectId('000000000000'),
      name: 'FooUnit',
      organization,
    }).save();
    user = {
      _id: new Types.ObjectId('000000000000'),
      email: 'foo@example.com',
      password: 'bar',
      unit,
    };
    userBar = {
      _id: new Types.ObjectId('000000000001'),
      email: 'bar@example.com',
      password: 'bar2',
      unit,
    };
    policy = {
      _id: new Types.ObjectId('000000000000'),
      name: 'Foo',
      effect: Effect.Allow,
      actions: ['Foo:Action'],
      resources: ['*'],
      unit,
    };
  });

  afterEach(async () => {
    await mongoConnection.dropDatabase();
  });

  describe('create', () => {
    it('should create an user and not return the password', async () => {
      const responseUser = await userService.create(
        {
          email: 'foo@example.com',
          password: 'bar',
        },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${CreateUser}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseUser._id).toBeDefined();
      expect(responseUser.email).toBe('foo@example.com');
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.twoFactorAuthenticationSecret).toBeUndefined();
    });

    it('should create an user and not return the password and return the policies', async () => {
      const savedPolicy = await new policyModel(policy).save();
      const responseUser = await userService.create(
        {
          email: 'foo@example.com',
          password: 'bar',
          policies: [savedPolicy.id],
        },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${CreateUser}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseUser._id).toBeDefined();
      expect(responseUser.email).toBe('foo@example.com');
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.policies).toBeUndefined();
      expect(responseUser.twoFactorAuthenticationSecret).toBeUndefined();
    });

    it('should fail to create an user if the email is not valid', async () => {
      await expect(
        userService.create(
          {
            email: 'foo',
            password: 'bar',
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:${CreateUser}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow('email: Must be a valid email');
    });

    it('should fail to create an user if the policies are incorrect', async () => {
      await expect(
        userService.create(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${UserScope}:${CreateUser}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${CreateUser}" on "${UserScope}"`);

      await expect(
        userService.create(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${CreateUser}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${CreateUser}" on "${UserScope}"`);

      await expect(
        userService.create(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${CreateUser}" on "${UserScope}"`);
    });

    it('should create an user based on condition', async () => {
      const responseUser = await userService.create(
        {
          email: 'foo@example.com',
          password: 'bar',
        },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${CreateUser}`],
              resources: ['*'],
              condition: { StringEquals: { email: 'foo@example.com' } },
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseUser._id).toBeDefined();
      expect(responseUser.email).toBe('foo@example.com');
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.twoFactorAuthenticationSecret).toBeUndefined();

      await expect(
        userService.create(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:${CreateUser}`],
                resources: ['*'],
                condition: { StringEquals: { email: 'bar@example.com' } },
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${CreateUser}" on "${UserScope}"`);
    });

    it('should emit create user event', async () => {
      const emitSpy = jest.spyOn(eventsService, 'emit');
      const responseUser = await userService.create(
        {
          email: 'foo@example.com',
          password: 'bar',
        },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${CreateUser}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(emitSpy).toBeCalledWith(new UserCreatedEvent(responseUser));
    });
  });

  describe('findOne', () => {
    it('should return an user without password', async () => {
      await new userModel(user).save();
      const responseUser = await userService.findOne(
        user._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${GetUser}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.twoFactorAuthenticationSecret).toBeUndefined();
    });

    it('should return an user without password', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel({ ...user, policies: [savedPolicy] }).save();
      const responseUser = await userService.findOne(
        user._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${GetUser}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.twoFactorAuthenticationSecret).toBeUndefined();
    });

    it('should fail to get an user if the policies are incorrect', async () => {
      await new userModel(user).save();
      await expect(
        userService.findOne(
          user._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${UserScope}:${GetUser}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${GetUser}" on "${UserScope}"`);

      await expect(
        userService.findOne(
          user._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${GetUser}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${GetUser}" on "${UserScope}"`);

      await expect(
        userService.findOne(
          user._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${GetUser}" on "${UserScope}"`);
    });

    it('should get an user based on condition', async () => {
      await new userModel(user).save();
      const responseUser = await userService.findOne(
        user._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${GetUser}`],
              resources: ['*'],
              condition: { StringEquals: { email: 'foo@example.com' } },
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseUser._id).toBeDefined();
      expect(responseUser.email).toBe('foo@example.com');
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.twoFactorAuthenticationSecret).toBeUndefined();

      await expect(
        userService.findOne(
          user._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:${GetUser}`],
                resources: ['*'],
                condition: { StringEquals: { email: 'bar@example.com' } },
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });

    it('should fail to return an user if the unit is not the same', async () => {
      const savedPolicy = await new policyModel(policy).save();
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new userModel({
        ...user,
        policies: [savedPolicy],
        unit: unitBar,
      }).save();
      await expect(
        userService.findOne(
          user._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:${GetUser}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });

  describe('findOneByEmailAndPassword', () => {
    it('should return an user by email and password', async () => {
      const role = await new roleModel({ name: 'FooRole', unit });
      const hash = await bcrypt.hash('Foo', 10);
      await new userModel({
        email: 'foo@example.com',
        password: hash,
        unit,
        roles: [role],
      }).save();
      const responseUser = await userService.findOneByEmailAndPassword(
        user.email,
        'Foo',
      );
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBeNull();
      expect(responseUser.policies).toBeUndefined();
      expect(responseUser.unit).toBeDefined();
      expect(responseUser.unit._id).toStrictEqual(unit._id);
      expect(responseUser.unit.organization).toBeDefined();
      expect(responseUser.unit.organization._id).toStrictEqual(
        organization._id,
      );
      expect(responseUser.unit.organization._id).toStrictEqual(
        organization._id,
      );
      expect(responseUser.roles.length).toBe(1);
      expect(responseUser.roles[0]._id).toStrictEqual(role._id);
    });

    it('should fail to return an user with wrong password', async () => {
      const hash = await bcrypt.hash('Foo', 10);
      await new userModel({
        ...user,
        password: hash,
        unit,
      }).save();
      const responseUser = await userService.findOneByEmailAndPassword(
        user.email,
        'Bar',
      );
      expect(responseUser).toBeNull();
    });
  });

  describe('findOneWithPolicies', () => {
    it('should return an user without password and with policies', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel({
        ...user,
        policies: [savedPolicy._id],
        unit,
      }).save();
      const responseUser = await userService.findOneWithPolicies(user.email);
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.twoFactorAuthenticationSecret).toBeUndefined();
      expect(responseUser.unit).toBeDefined();
      expect(responseUser.unit._id).toStrictEqual(unit._id);
      expect(responseUser.unit.organization).toBeDefined();
      expect(responseUser.unit.organization._id).toStrictEqual(
        organization._id,
      );
      expect(responseUser.policies.length).toBe(1);

      const responsePolicy = responseUser.policies[0];
      expect(responsePolicy.actions).toEqual(savedPolicy.actions);
      expect(responsePolicy.effect).toBe(savedPolicy.effect);
      expect(responsePolicy.name).toBe(savedPolicy.name);
      expect(responsePolicy.resources).toEqual(savedPolicy.resources);
    });

    it('should return an user without password, with policies and groups with policies', async () => {
      const savedPolicy = await new policyModel(policy).save();
      const savedGroup = await new groupModel({
        name: 'FooGroup',
        policies: [savedPolicy._id],
        unit,
      }).save();
      await new userModel({
        ...user,
        policies: [savedPolicy._id],
        groups: [savedGroup._id],
        unit,
      }).save();

      const responseUser = await userService.findOneWithPolicies(user.email);
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.twoFactorAuthenticationSecret).toBeUndefined();

      expect(responseUser.policies.length).toBe(1);
      const responsePolicy = responseUser.policies[0];
      expect(responsePolicy.actions).toEqual(savedPolicy.actions);
      expect(responsePolicy.effect).toBe(savedPolicy.effect);
      expect(responsePolicy.name).toBe(savedPolicy.name);
      expect(responsePolicy.resources).toEqual(savedPolicy.resources);

      expect(responseUser.groups.length).toBe(1);
      const responseGroup = responseUser.groups[0];
      expect(responseGroup.name).toEqual(savedGroup.name);

      expect(responseGroup.policies.length).toBe(1);
      const responseGroupPolicy = responseGroup.policies[0];
      expect(responseGroupPolicy.actions).toEqual(savedPolicy.actions);
      expect(responseGroupPolicy.effect).toBe(savedPolicy.effect);
      expect(responseGroupPolicy.name).toBe(savedPolicy.name);
      expect(responseGroupPolicy.resources).toEqual(savedPolicy.resources);
    });

    it('should return an user without password, with policies and roles with policies', async () => {
      const savedPolicy = await new policyModel(policy).save();
      const savedRole = await new roleModel({
        name: 'FooRole',
        policies: [savedPolicy._id],
        unit,
      }).save();
      await new userModel({
        ...user,
        policies: [savedPolicy._id],
        roles: [savedRole._id],
        unit,
      }).save();

      const responseUser = await userService.findOneWithPolicies(user.email);
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.twoFactorAuthenticationSecret).toBeUndefined();

      expect(responseUser.policies.length).toBe(1);
      const responsePolicy = responseUser.policies[0];
      expect(responsePolicy.actions).toEqual(savedPolicy.actions);
      expect(responsePolicy.effect).toBe(savedPolicy.effect);
      expect(responsePolicy.name).toBe(savedPolicy.name);
      expect(responsePolicy.resources).toEqual(savedPolicy.resources);

      expect(responseUser.roles.length).toBe(1);
      const responseRole = responseUser.roles[0];
      expect(responseRole.name).toEqual(savedRole.name);
      expect(responseRole.unit._id).toBeDefined();
      expect(responseRole.unit.organization._id).toBeDefined();

      expect(responseRole.policies.length).toBe(1);
      const responseGroupPolicy = responseRole.policies[0];
      expect(responseGroupPolicy.actions).toEqual(savedPolicy.actions);
      expect(responseGroupPolicy.effect).toBe(savedPolicy.effect);
      expect(responseGroupPolicy.name).toBe(savedPolicy.name);
      expect(responseGroupPolicy.resources).toEqual(savedPolicy.resources);
    });
  });

  describe('findAll', () => {
    it('should return an array of users without password and policies', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel({ ...user, policies: [savedPolicy] }).save();
      await new userModel({ ...userBar }).save();

      const responseUsers = await userService.findAll(
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${ListUsers}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseUsers.length).toBe(2);
      expect(responseUsers[0].password).toBeUndefined();
      expect(responseUsers[0].policies).toBeUndefined();
      expect(responseUsers[0].twoFactorAuthenticationSecret).toBeUndefined();
      expect(responseUsers[1].password).toBeUndefined();
      expect(responseUsers[1].policies).toBeUndefined();
      expect(responseUsers[1].twoFactorAuthenticationSecret).toBeUndefined();
    });

    it('should return an array of users based on condition', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel({ ...user, policies: [savedPolicy] }).save();
      await new userModel({ ...userBar }).save();

      let responseUsers = await userService.findAll(
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${ListUsers}`],
              resources: ['*'],
              condition: { StringEquals: { email: 'foo@example.com' } },
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseUsers.length).toBe(1);
      expect(responseUsers[0].password).toBeUndefined();
      expect(responseUsers[0].policies).toBeUndefined();
      expect(responseUsers[0].twoFactorAuthenticationSecret).toBeUndefined();

      responseUsers = await userService.findAll(
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${ListUsers}`],
              resources: ['*'],
              condition: { StringEquals: { email: 'baz@example.com' } },
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseUsers.length).toBe(0);
    });

    it('should return an array of users based on unit', async () => {
      const savedPolicy = await new policyModel(policy).save();
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new userModel({ ...user, policies: [savedPolicy] }).save();
      await new userModel({ ...userBar, unit: unitBar }).save();

      const responseUsers = await userService.findAll(
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${ListUsers}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseUsers.length).toBe(1);
      expect(responseUsers[0].password).toBeUndefined();
      expect(responseUsers[0].policies).toBeUndefined();
      expect(responseUsers[0].twoFactorAuthenticationSecret).toBeUndefined();
    });

    it('should fail to return an array of users if the policies are incorrect', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel({ ...user, policies: [savedPolicy] }).save();
      await new userModel({ ...userBar }).save();

      await expect(
        userService.findAll(
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${UserScope}:${ListUsers}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${ListUsers}" on "${UserScope}"`);

      await expect(
        userService.findAll(
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${ListUsers}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${ListUsers}" on "${UserScope}"`);

      await expect(
        userService.findAll(
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${ListUsers}" on "${UserScope}"`);
    });
  });

  describe('update', () => {
    it('should update user with policies', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel({ ...user, policies: [savedPolicy] }).save();

      const updatedUser = await userService.update(
        user._id.toString(),
        {
          policies: [],
        },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${UpdateUser}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(updatedUser.password).toBeUndefined();
      expect(updatedUser.twoFactorAuthenticationSecret).toBeUndefined();
    });

    it('should update user without policies', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel(user).save();

      const updatedUser = await userService.update(
        user._id.toString(),
        {
          policies: [savedPolicy._id.toString()],
        },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${UpdateUser}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(updatedUser.password).toBeUndefined();
      expect(updatedUser.twoFactorAuthenticationSecret).toBeUndefined();
    });

    it('should fail to update an user if the policies are incorrect', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel(user).save();

      await expect(
        userService.update(
          user._id.toString(),
          {
            policies: [savedPolicy._id.toString()],
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${UserScope}:${UpdateUser}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${UpdateUser}" on "${UserScope}"`);

      await expect(
        userService.update(
          user._id.toString(),
          {
            policies: [savedPolicy._id.toString()],
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${UpdateUser}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${UpdateUser}" on "${UserScope}"`);

      await expect(
        userService.update(
          user._id.toString(),
          {
            policies: [savedPolicy._id.toString()],
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${UpdateUser}" on "${UserScope}"`);
    });

    it('should update an user based on condition', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel(user).save();

      const responseUser = await userService.update(
        user._id.toString(),
        {
          policies: [savedPolicy._id.toString()],
        },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${UpdateUser}`],
              resources: ['*'],
              condition: { StringEquals: { email: 'foo@example.com' } },
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseUser._id).toBeDefined();
      expect(responseUser.email).toBe('foo@example.com');
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.twoFactorAuthenticationSecret).toBeUndefined();

      await expect(
        userService.update(
          user._id.toString(),
          {
            policies: [savedPolicy._id.toString()],
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:${UpdateUser}`],
                resources: ['*'],
                condition: { StringEquals: { email: 'bar@example.com' } },
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });

    it('should fail to update an user if the entity is not the same', async () => {
      const savedPolicy = await new policyModel(policy).save();
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new userModel({ ...user, unit: unitBar }).save();

      await expect(
        userService.update(
          user._id.toString(),
          {
            policies: [savedPolicy._id.toString()],
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:${UpdateUser}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });

  describe('remove', () => {
    it('should remove an user', async () => {
      await new userModel(user).save();

      await userService.remove(
        user._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${RemoveUser}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect((await userModel.count()).valueOf()).toBe(0);
    });

    it('should fail to remove an user if the policies are incorrect', async () => {
      await new userModel(user).save();

      await expect(
        userService.remove(
          user._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${UserScope}:${RemoveUser}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${RemoveUser}" on "${UserScope}"`);

      await expect(
        userService.remove(
          user._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${RemoveUser}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${RemoveUser}" on "${UserScope}"`);

      await expect(
        userService.remove(
          user._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${RemoveUser}" on "${UserScope}"`);
    });

    it('should remove an user based on condition', async () => {
      await new userModel(user).save();

      await userService.remove(
        user._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${RemoveUser}`],
              resources: ['*'],
              condition: { StringEquals: { email: 'foo@example.com' } },
            },
          ],
        },
        unit._id.toString(),
      );
      expect((await userModel.count()).valueOf()).toBe(0);

      await new userModel(user).save();
      await expect(
        userService.remove(
          user._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:${RemoveUser}`],
                resources: ['*'],
                condition: { StringEquals: { email: 'bar@example.com' } },
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });

    it('should fail to remove an user if entity is not the same', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new userModel({ ...user, unit: unitBar }).save();

      await expect(
        userService.remove(
          user._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:${RemoveUser}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });

  describe('addGroupToUser', () => {
    it('should add a group to an user', async () => {
      await new userModel(user).save();
      const savedPolicy = await new policyModel(policy).save();
      const groupResponse = await new groupModel({
        name: 'FooGroup',
        policies: [savedPolicy._id],
        unit,
      }).save();
      const userResponse = await userService.addGroupToUser(
        user._id.toString(),
        groupResponse.id,
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${AddGroupToUser}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );

      expect(userResponse.groups.length).toBe(1);
      expect(userResponse.groups[0]._id.toString()).toBe(
        groupResponse.id.toString(),
      );
      expect(userResponse.groups[0].name).toBe(groupResponse.name);
      expect(userResponse.groups[0].policies).toBe(undefined);
    });

    it('should fail to add a group to an user if the group is not it the same unit', async () => {
      await new userModel(user).save();
      const savedPolicy = await new policyModel(policy).save();
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      const groupResponse = await new groupModel({
        name: 'FooGroup',
        policies: [savedPolicy],
        unit: unitBar,
      }).save();
      await expect(
        userService.addGroupToUser(
          user._id.toString(),
          groupResponse.id,
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:${AddGroupToUser}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(/.*Group not found.*/);
    });
  });

  describe('generate2FA', () => {
    it('should add a 2FA to an user', async () => {
      await new userModel(user).save();
      const otpauthUrl = await userService.generate2FA(
        user._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${Activate2FA}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(otpauthUrl).toBeDefined();

      const savedUser = await userModel.findById(user._id);
      expect(savedUser.twoFactorAuthenticationSecret).toBeDefined();
    });
  });

  describe('validate2FA', () => {
    it('should fail to validate 2FA if the user does not have it generated', async () => {
      await new userModel(user).save();
      await expect(
        userService.validate2FA(
          user._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:${Activate2FA}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
          '1234',
        ),
      ).rejects.toThrow('Not Found');
    });

    it('should fail to validate a 2FA if the code is invalid', async () => {
      user.twoFactorAuthenticationSecret = 'ABCDEFGH';
      await new userModel(user).save();
      await expect(
        userService.validate2FA(
          user._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UserScope}:${Activate2FA}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
          '123456123456',
        ),
      ).rejects.toThrow('Bad Request');
    });

    it('should validate a 2FA to an user', async () => {
      const secret = 'ABCDEFGH';
      user.twoFactorAuthenticationSecret = secret;
      await new userModel(user).save();
      await userService.validate2FA(
        user._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${Activate2FA}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
        authenticator.generate(secret),
      );

      const savedUser = await userModel.findById(user._id);
      expect(savedUser.isTwoFactorAuthenticationEnabled).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should fail to change password if user is not in database', async () => {
      await expect(
        userService.changePassword('foo@bar.com', 'Foo', 'Bar'),
      ).rejects.toThrow('User does not exist');

      await new userModel(user).save();
      await expect(
        userService.changePassword('xxx' + user.email, 'Foo', 'Bar'),
      ).rejects.toThrow('User does not exist');
    });

    it('should fail to change password if the old password is wrong', async () => {
      await new userModel(user).save();
      await expect(
        userService.changePassword(user.email, 'Foo', 'Bar'),
      ).rejects.toThrow('Old password is wrong');
    });

    it('should change password to user', async () => {
      const hash = await bcrypt.hash(user.password, 10);
      await new userModel({ ...user, password: hash }).save();
      await userService.changePassword(user.email, 'bar', 'Foo');
    });
  });

  describe('findOneByEmail', () => {
    it('should return an user without password', async () => {
      await new userModel(user).save();
      const responseUser = await userService.findOneByEmail(user.email);
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.twoFactorAuthenticationSecret).toBeUndefined();
    });
  });

  describe('updateRecoveryToken', () => {
    it('should put recovery token for an user', async () => {
      await new userModel(user).save();
      const token = 'foo';
      await userService.updateRecoveryToken(user.email, token);
      const response = await userModel.findById(user._id);
      expect(response.recoveryToken).toBe(token);
      expect(response.recoveryTokenExpiredAt).toBeDefined();
    });

    it('should fail if the user does not exists', async () => {
      await new userModel(user).save();
      await expect(
        userService.updateRecoveryToken('foo', 'foo'),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });

  describe('resetPassword', () => {
    it('should reset password for an user', async () => {
      const token = 'foo';
      user.recoveryToken = token;
      user.recoveryTokenExpiredAt = new Date(Date.now() + 60 * 60 * 1000);
      await new userModel(user).save();
      await userService.resetPassword(user.email, token, 'foo');
      const response = await userModel.findById(user._id);
      expect(response.recoveryToken).toBeUndefined();
      expect(response.recoveryTokenExpiredAt).toBeUndefined();
    });

    it('should fail to reset password for an user if there is no token, the token is wrong, there is no token expiration or the token has expired', async () => {
      const token = 'foo';
      user.recoveryTokenExpiredAt = new Date(Date.now() + 60 * 60 * 1000);
      await new userModel(user).save();
      await expect(
        userService.resetPassword(user.email, token, 'foo'),
      ).rejects.toThrow('Invalid token');

      user._id = undefined;
      user.recoveryToken = 'bar';
      await new userModel(user).save();
      await expect(
        userService.resetPassword(user.email, token, 'foo'),
      ).rejects.toThrow('Invalid token');

      user._id = undefined;
      user.recoveryToken = token;
      user.recoveryTokenExpiredAt = undefined;
      await new userModel(user).save();
      await expect(
        userService.resetPassword(user.email, token, 'foo'),
      ).rejects.toThrow('Invalid token');

      user._id = undefined;
      user.recoveryToken = token;
      user.recoveryTokenExpiredAt = new Date(Date.now() - 60 * 60 * 1000);
      await new userModel(user).save();
      await expect(
        userService.resetPassword(user.email, token, 'foo'),
      ).rejects.toThrow('Invalid token');
    });
  });
});

import * as bcrypt from 'bcrypt';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Connection, connect, Model, Types } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
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
} from './users.actions';
import { Group, GroupSchema } from '../groups/groups.schema';
import { Unit, UnitSchema } from '../units/units.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organizations/organizations.schema';

describe('UserService', () => {
  let userService: UserService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let userModel: Model<User>;
  let policyModel: Model<Policy>;
  let groupModel: Model<Group>;
  let unitModel: Model<Unit>;
  let organizationModel: Model<Organization>;

  let organization: Organization;
  let unit: Unit;
  let user: User;
  let userBar: User;
  let policy: Policy;

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
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        CaslAbilityFactory,
        { provide: getModelToken(User.name), useValue: userModel },
        {
          provide: getModelToken(Policy.name),
          useValue: policyModel,
        },
        {
          provide: getModelToken(Group.name),
          useValue: groupModel,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
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
    });

    it('should return an user without password or policies', async () => {
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
      expect(responseUser.policies).toBeUndefined();
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
      const hash = await bcrypt.hash('Foo', 10);
      await new userModel({
        email: 'foo@example.com',
        password: hash,
        unit,
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
        policies: [savedPolicy],
        unit,
      }).save();
      const responseUser = await userService.findOneWithPolicies(user.email);
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBeUndefined();
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
        policies: [savedPolicy],
        unit,
      }).save();
      await new userModel({
        ...user,
        policies: [savedPolicy],
        groups: [savedGroup],
        unit,
      }).save();

      const responseUser = await userService.findOneWithPolicies(user.email);
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBeUndefined();

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
      expect(responseUsers[1].password).toBeUndefined();
      expect(responseUsers[1].policies).toBeUndefined();
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
      expect(updatedUser.policies).toBeUndefined();
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
      expect(updatedUser.policies).toBeUndefined();
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
        policies: [savedPolicy],
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
});

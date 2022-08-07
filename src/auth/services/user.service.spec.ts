import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Connection, connect, Model, Types } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserService } from './user.service';
import { User, UserSchema } from '../schemas/user.schema';
import { Policy, PolicySchema } from '../schemas/policy.schema';
import { CaslAbilityFactory, Effect } from '../factories/casl-ability.factory';
import {
  CreateUser,
  GetUser,
  ListUsers,
  UpdateUser,
  UserScope,
  RemoveUser,
} from '../actions/user.actions';

describe('UserService', () => {
  let userService: UserService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let userModel: Model<User>;
  let policyModel: Model<Policy>;

  const user: User = {
    _id: new Types.ObjectId('000000000000'),
    email: 'foo@example.com',
    password: 'bar',
  };

  const policy: Policy = {
    _id: new Types.ObjectId('000000000000'),
    name: 'Foo',
    effect: Effect.Allow,
    actions: ['Foo:Action'],
    resources: ['*'],
  };

  const users: User[] = [
    user,
    {
      _id: new Types.ObjectId('000000000001'),
      email: 'bar@example.com',
      password: 'bar2',
    },
  ];

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    userModel = mongoConnection.model(User.name, UserSchema);
    policyModel = mongoConnection.model(Policy.name, PolicySchema);
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        CaslAbilityFactory,
        { provide: getModelToken(User.name), useValue: userModel },
        {
          provide: getModelToken(Policy.name),
          useValue: policyModel,
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
        ),
      ).rejects.toThrow(`Cannot execute "${CreateUser}" on "${UserScope}"`);
    });
  });

  describe('findOne', () => {
    it('should return an user without password', async () => {
      await new userModel(user).save();
      const responseUser = await userService.findOne(user._id.toString(), {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${GetUser}`],
            resources: ['*'],
          },
        ],
      });
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBeUndefined();
    });

    it('should return an user without password or policies', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel({ ...user, policies: [savedPolicy] }).save();
      const responseUser = await userService.findOne(user._id.toString(), {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${GetUser}`],
            resources: ['*'],
          },
        ],
      });
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.policies).toBeUndefined();
    });

    it('should fail to get an user if the policies are incorrect', async () => {
      await new userModel(user).save();
      await expect(
        userService.findOne(user._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${UserScope}:${GetUser}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${GetUser}" on "${UserScope}"`);

      await expect(
        userService.findOne(user._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${GetUser}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${GetUser}" on "${UserScope}"`);

      await expect(
        userService.findOne(user._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:Action`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${GetUser}" on "${UserScope}"`);
    });

    it('should get an user based on condition', async () => {
      await new userModel(user).save();
      const responseUser = await userService.findOne(user._id.toString(), {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${GetUser}`],
            resources: ['*'],
            condition: { StringEquals: { email: 'foo@example.com' } },
          },
        ],
      });
      expect(responseUser._id).toBeDefined();
      expect(responseUser.email).toBe('foo@example.com');
      expect(responseUser.password).toBeUndefined();

      await expect(
        userService.findOne(user._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${GetUser}`],
              resources: ['*'],
              condition: { StringEquals: { email: 'bar@example.com' } },
            },
          ],
        }),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });

  describe('findOneWithPassword', () => {
    it('should return an user with password but without policies', async () => {
      await new userModel(user).save();
      const responseUser = await userService.findOneWithPassword(user.email);
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBe(user.password);
      expect(responseUser.policies).toBeUndefined();
    });
  });

  describe('findOneWithPolicies', () => {
    it('should return an user without password and with policies', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel({ ...user, policies: [savedPolicy] }).save();
      const responseUser = await userService.findOneWithPolicies(user.email);
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.policies.length).toBe(1);

      const responsePolicy = responseUser.policies[0];
      expect(responsePolicy.actions).toEqual(savedPolicy.actions);
      expect(responsePolicy.effect).toBe(savedPolicy.effect);
      expect(responsePolicy.name).toBe(savedPolicy.name);
      expect(responsePolicy.resources).toEqual(savedPolicy.resources);
    });
  });

  describe('findAll', () => {
    it('should return an array of users without password and policies', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel({ ...users[0], policies: [savedPolicy] }).save();
      await new userModel({ ...users[1] }).save();

      const responseUsers = await userService.findAll({
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${ListUsers}`],
            resources: ['*'],
          },
        ],
      });
      expect(responseUsers.length).toBe(2);
      expect(responseUsers[0].password).toBeUndefined();
      expect(responseUsers[0].policies).toBeUndefined();
      expect(responseUsers[1].password).toBeUndefined();
      expect(responseUsers[1].policies).toBeUndefined();
    });

    it('should return an array of users based on condition', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel({ ...users[0], policies: [savedPolicy] }).save();
      await new userModel({ ...users[1] }).save();

      let responseUsers = await userService.findAll({
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${ListUsers}`],
            resources: ['*'],
            condition: { StringEquals: { email: 'foo@example.com' } },
          },
        ],
      });
      expect(responseUsers.length).toBe(1);
      expect(responseUsers[0].password).toBeUndefined();
      expect(responseUsers[0].policies).toBeUndefined();

      responseUsers = await userService.findAll({
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${ListUsers}`],
            resources: ['*'],
            condition: { StringEquals: { email: 'baz@example.com' } },
          },
        ],
      });
      expect(responseUsers.length).toBe(0);
    });

    it('should fail to return an array of users if the policies are incorrect', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel({ ...users[0], policies: [savedPolicy] }).save();
      await new userModel({ ...users[1] }).save();

      await expect(
        userService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${UserScope}:${ListUsers}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${ListUsers}" on "${UserScope}"`);

      await expect(
        userService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${ListUsers}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${ListUsers}" on "${UserScope}"`);

      await expect(
        userService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:Action`],
              resources: ['*'],
            },
          ],
        }),
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
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });

  describe('remove', () => {
    it('should remove an user', async () => {
      await new userModel(user).save();

      await userService.remove(user._id.toString(), {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${RemoveUser}`],
            resources: ['*'],
          },
        ],
      });
      expect((await userModel.count()).valueOf()).toBe(0);
    });

    it('should fail to remove an user if the policies are incorrect', async () => {
      await new userModel(user).save();

      await expect(
        userService.remove(user._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${UserScope}:${RemoveUser}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${RemoveUser}" on "${UserScope}"`);

      await expect(
        userService.remove(user._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${RemoveUser}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${RemoveUser}" on "${UserScope}"`);

      await expect(
        userService.remove(user._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:Action`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${RemoveUser}" on "${UserScope}"`);
    });

    it('should remove an user based on condition', async () => {
      await new userModel(user).save();

      await userService.remove(user._id.toString(), {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${RemoveUser}`],
            resources: ['*'],
            condition: { StringEquals: { email: 'foo@example.com' } },
          },
        ],
      });
      expect((await userModel.count()).valueOf()).toBe(0);

      await new userModel(user).save();
      await expect(
        userService.remove(user._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UserScope}:${RemoveUser}`],
              resources: ['*'],
              condition: { StringEquals: { email: 'bar@example.com' } },
            },
          ],
        }),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });
});

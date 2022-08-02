import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserService } from './user.service';
import { User, UserSchema } from '../schemas/user.schema';
import { Effect, Policy, PolicySchema } from '../schemas/policy.schema';

describe('UserService', () => {
  let userService: UserService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let userModel: Model<User>;
  let policyModel: Model<Policy>;

  const user: User = {
    _id: new Types.ObjectId('000000000000'),
    email: 'foo',
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
      email: 'foo2',
      password: 'bar2',
    },
  ];

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    userModel = mongoConnection.model(User.name, UserSchema);
    policyModel = mongoConnection.model(Policy.name, PolicySchema);
    const module = await Test.createTestingModule({
      providers: [
        UserService,
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
      const responseUser = await userService.create({
        email: 'foo',
        password: 'bar',
      });
      expect(responseUser._id).toBeDefined();
      expect(responseUser.email).toBe('foo');
      expect(responseUser.password).toBeUndefined();
    });

    it('should create an user and not return the password and return the policies', async () => {
      const savedPolicy = await new policyModel(policy).save();
      const responseUser = await userService.create({
        email: 'foo',
        password: 'bar',
        policies: [savedPolicy.id],
      });
      expect(responseUser._id).toBeDefined();
      expect(responseUser.email).toBe('foo');
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.policies).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('should return an user without password', async () => {
      await new userModel(user).save();
      const responseUser = await userService.findOne(user._id.toString());
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBeUndefined();
    });

    it('should return an user without password or policies', async () => {
      const savedPolicy = await new policyModel(policy).save();
      await new userModel({ ...user, policies: [savedPolicy] }).save();
      const responseUser = await userService.findOne(user._id.toString());
      expect(responseUser.email).toBe(user.email);
      expect(responseUser.password).toBeUndefined();
      expect(responseUser.policies).toBeUndefined();
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

      const responseUsers = await userService.findAll();
      expect(responseUsers.length).toBe(2);
      expect(responseUsers[0].password).toBeUndefined();
      expect(responseUsers[0].policies).toBeUndefined();
      expect(responseUsers[1].password).toBeUndefined();
      expect(responseUsers[1].policies).toBeUndefined();
    });
  });
});

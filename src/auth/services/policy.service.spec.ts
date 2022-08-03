import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PolicyService } from './policy.service';
import { Effect, Policy, PolicySchema } from '../schemas/policy.schema';

describe('PolicyService', () => {
  let policyService: PolicyService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let policyModel: Model<Policy>;

  const policy: Policy = {
    _id: new Types.ObjectId('000000000000'),
    name: 'Foo',
    effect: Effect.Allow,
    actions: ['Foo:Action'],
    resources: ['*'],
  };

  const policies: Policy[] = [
    policy,
    {
      _id: new Types.ObjectId('000000000001'),
      name: 'Bar',
      effect: Effect.Allow,
      actions: ['Bar:Action'],
      resources: ['*'],
    },
  ];

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    policyModel = mongoConnection.model(Policy.name, PolicySchema);
    const module = await Test.createTestingModule({
      providers: [
        PolicyService,
        { provide: getModelToken(Policy.name), useValue: policyModel },
      ],
    }).compile();

    policyService = module.get<PolicyService>(PolicyService);
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
    it('should create a policy', async () => {
      const responsePolicy = await policyService.create({
        name: 'Foo',
        effect: Effect.Allow,
        actions: ['Foo:Action'],
        resources: ['*'],
      });
      expect(responsePolicy.name).toBe('Foo');
      expect(responsePolicy.effect).toBe(Effect.Allow);
      expect(responsePolicy.actions).toEqual(['Foo:Action']);
      expect(responsePolicy.resources).toEqual(['*']);
    });
  });

  describe('findOne', () => {
    it('should return a policy', async () => {
      await new policyModel(policy).save();
      const responsePolicy = await policyService.findOne(policy._id.toString());
      expect(responsePolicy.name).toBe(policy.name);
      expect(responsePolicy.effect).toBe(policy.effect);
      expect(responsePolicy.actions).toEqual(policy.actions);
      expect(responsePolicy.resources).toEqual(policy.resources);
    });
  });

  describe('findAll', () => {
    it('should return an array of policies', async () => {
      await new policyModel(policies[0]).save();
      await new policyModel(policies[1]).save();

      const responsePolicies = await policyService.findAll();
      expect(responsePolicies.length).toBe(2);
      expect(responsePolicies[0].name).toBe(policies[0].name);
      expect(responsePolicies[0].effect).toBe(policies[0].effect);
      expect(responsePolicies[0].actions).toEqual(policies[0].actions);
      expect(responsePolicies[0].resources).toEqual(policies[0].resources);
      expect(responsePolicies[1].name).toBe(policies[1].name);
      expect(responsePolicies[1].effect).toBe(policies[1].effect);
      expect(responsePolicies[1].actions).toEqual(policies[1].actions);
      expect(responsePolicies[1].resources).toEqual(policies[1].resources);
    });
  });

  describe('update', () => {
    it('should update policy', async () => {
      const responsePolicy = await policyService.create({
        name: 'Foo',
        effect: Effect.Allow,
        actions: ['Foo:Action'],
        resources: ['*'],
      });

      const updatedPolicy = await policyService.update(
        responsePolicy._id.toString(),
        {
          name: 'Bar',
          effect: Effect.Deny,
          actions: ['Bar:Action'],
          resources: ['000000000000'],
        },
      );
      expect(updatedPolicy.name).toBe('Bar');
      expect(updatedPolicy.effect).toBe(Effect.Deny);
      expect(updatedPolicy.actions).toEqual(['Bar:Action']);
      expect(updatedPolicy.resources).toEqual(['000000000000']);
    });
  });

  describe('remove', () => {
    it('should remove a policy', async () => {
      await new policyModel(policy).save();

      await policyService.remove(policy._id.toString());
      expect((await policyModel.count()).valueOf()).toBe(0);
    });
  });
});

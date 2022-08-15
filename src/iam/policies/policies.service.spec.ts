import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Connection, connect, Model, Types } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PolicyService } from './policies.service';
import { Policy, PolicySchema } from './policies.schema';
import {
  CaslAbilityFactory,
  Effect,
} from '../../framework/factories/casl-ability.factory';
import {
  CreatePolicy,
  GetPolicy,
  ListPolicies,
  PolicyScope,
  RemovePolicy,
  UpdatePolicy,
} from './policies.actions';

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
    mongoose.plugin(accessibleRecordsPlugin);
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    policyModel = mongoConnection.model(Policy.name, PolicySchema);
    const module = await Test.createTestingModule({
      providers: [
        PolicyService,
        CaslAbilityFactory,
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
      const responsePolicy = await policyService.create(
        {
          name: 'Foo',
          effect: Effect.Allow,
          actions: ['Foo:Action'],
          resources: ['*'],
        },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${CreatePolicy}`],
              resources: ['*'],
            },
          ],
        },
      );
      expect(responsePolicy.name).toBe('Foo');
      expect(responsePolicy.effect).toBe(Effect.Allow);
      expect(responsePolicy.actions).toEqual(['Foo:Action']);
      expect(responsePolicy.resources).toEqual(['*']);
    });

    it('should create a policy with condition', async () => {
      const responsePolicy = await policyService.create(
        {
          name: 'Foo',
          effect: Effect.Allow,
          actions: ['Foo:Action'],
          resources: ['*'],
          condition: { StringEquals: { foo: 'bar' } },
        },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${CreatePolicy}`],
              resources: ['*'],
            },
          ],
        },
      );
      expect(responsePolicy.name).toBe('Foo');
      expect(responsePolicy.effect).toBe(Effect.Allow);
      expect(responsePolicy.actions).toEqual(['Foo:Action']);
      expect(responsePolicy.resources).toEqual(['*']);
      expect(responsePolicy.condition).toEqual({
        StringEquals: { foo: 'bar' },
      });
    });

    it('should fail to create a policy if the policies are incorrect', async () => {
      await expect(
        policyService.create(
          {
            name: 'Foo',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
            condition: { StringEquals: { foo: 'bar' } },
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${PolicyScope}:${CreatePolicy}`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(`Cannot execute "${CreatePolicy}" on "${PolicyScope}"`);

      await expect(
        policyService.create(
          {
            name: 'Foo',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
            condition: { StringEquals: { foo: 'bar' } },
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${CreatePolicy}`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(`Cannot execute "${CreatePolicy}" on "${PolicyScope}"`);

      await expect(
        policyService.create(
          {
            name: 'Foo',
            effect: Effect.Allow,
            actions: ['Foo:Action'],
            resources: ['*'],
            condition: { StringEquals: { foo: 'bar' } },
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${PolicyScope}:Action`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(`Cannot execute "${CreatePolicy}" on "${PolicyScope}"`);
    });
  });

  describe('findOne', () => {
    it('should return a policy', async () => {
      await new policyModel(policy).save();
      const responsePolicy = await policyService.findOne(
        policy._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${GetPolicy}`],
              resources: ['*'],
            },
          ],
        },
      );
      expect(responsePolicy.name).toBe(policy.name);
      expect(responsePolicy.effect).toBe(policy.effect);
      expect(responsePolicy.actions).toEqual(policy.actions);
      expect(responsePolicy.resources).toEqual(policy.resources);
    });

    it('should fail to get a policy if the policies are incorrect', async () => {
      await new policyModel(policy).save();
      await expect(
        policyService.findOne(policy._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${PolicyScope}:${GetPolicy}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${GetPolicy}" on "${PolicyScope}"`);

      await expect(
        policyService.findOne(policy._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${GetPolicy}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${GetPolicy}" on "${PolicyScope}"`);

      await expect(
        policyService.findOne(policy._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:Action`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${GetPolicy}" on "${PolicyScope}"`);
    });

    it('should get a policy based on condition', async () => {
      await new policyModel(policy).save();
      const responsePolicy = await policyService.findOne(
        policy._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${GetPolicy}`],
              resources: ['*'],
              condition: { StringEquals: { name: 'Foo' } },
            },
          ],
        },
      );
      expect(responsePolicy.name).toBe(policy.name);
      expect(responsePolicy.effect).toBe(policy.effect);
      expect(responsePolicy.actions).toEqual(policy.actions);
      expect(responsePolicy.resources).toEqual(policy.resources);

      await expect(
        policyService.findOne(policy._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${GetPolicy}`],
              resources: ['*'],
              condition: { StringEquals: { name: 'Bar' } },
            },
          ],
        }),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });

  describe('findAll', () => {
    it('should return an array of policies', async () => {
      await new policyModel(policies[0]).save();
      await new policyModel(policies[1]).save();

      const responsePolicies = await policyService.findAll({
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${ListPolicies}`],
            resources: ['*'],
          },
        ],
      });
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

    it('should return an array of policies based on condition', async () => {
      await new policyModel(policies[0]).save();
      await new policyModel(policies[1]).save();

      let responsePolicies = await policyService.findAll({
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${ListPolicies}`],
            resources: ['*'],
            condition: { StringEquals: { name: 'Foo' } },
          },
        ],
      });
      expect(responsePolicies.length).toBe(1);
      expect(responsePolicies[0].name).toBe(policies[0].name);
      expect(responsePolicies[0].effect).toBe(policies[0].effect);
      expect(responsePolicies[0].actions).toEqual(policies[0].actions);
      expect(responsePolicies[0].resources).toEqual(policies[0].resources);

      responsePolicies = await policyService.findAll({
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${ListPolicies}`],
            resources: ['*'],
            condition: { StringEquals: { name: 'Baz' } },
          },
        ],
      });
      expect(responsePolicies.length).toBe(0);
    });

    it('should fail to return an array of policies if the policies are incorrect', async () => {
      await new policyModel(policies[0]).save();
      await new policyModel(policies[1]).save();

      await expect(
        policyService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${PolicyScope}:${ListPolicies}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${ListPolicies}" on "${PolicyScope}"`);

      await expect(
        policyService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${ListPolicies}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${ListPolicies}" on "${PolicyScope}"`);

      await expect(
        policyService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:Action`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${ListPolicies}" on "${PolicyScope}"`);
    });
  });

  describe('update', () => {
    it('should update policy', async () => {
      const responsePolicy = await new policyModel({
        name: 'Foo',
        effect: Effect.Allow,
        actions: ['Foo:Action'],
        resources: ['*'],
      }).save();

      const updatedPolicy = await policyService.update(
        responsePolicy._id.toString(),
        {
          name: 'Bar',
          effect: Effect.Deny,
          actions: ['Bar:Action'],
          resources: ['000000000000'],
        },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${UpdatePolicy}`],
              resources: ['*'],
            },
          ],
        },
      );
      expect(updatedPolicy.name).toBe('Bar');
      expect(updatedPolicy.effect).toBe(Effect.Deny);
      expect(updatedPolicy.actions).toEqual(['Bar:Action']);
      expect(updatedPolicy.resources).toEqual(['000000000000']);
    });

    it('should update policy and put a condition', async () => {
      const responsePolicy = await new policyModel({
        name: 'Foo',
        effect: Effect.Allow,
        actions: ['Foo:Action'],
        resources: ['*'],
      }).save();

      const updatedPolicy = await policyService.update(
        responsePolicy._id.toString(),
        {
          name: 'Bar',
          effect: Effect.Deny,
          actions: ['Bar:Action'],
          resources: ['000000000000'],
          condition: { StringEquals: { foo: 'bar' } },
        },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${UpdatePolicy}`],
              resources: ['*'],
            },
          ],
        },
      );
      expect(updatedPolicy.name).toBe('Bar');
      expect(updatedPolicy.effect).toBe(Effect.Deny);
      expect(updatedPolicy.actions).toEqual(['Bar:Action']);
      expect(updatedPolicy.resources).toEqual(['000000000000']);
      expect(updatedPolicy.condition).toEqual({
        StringEquals: { foo: 'bar' },
      });
    });

    it('should fail to update a policy if the policies are incorrect', async () => {
      const responsePolicy = await new policyModel({
        name: 'Foo',
        effect: Effect.Allow,
        actions: ['Foo:Action'],
        resources: ['*'],
      }).save();

      await expect(
        policyService.update(
          responsePolicy._id.toString(),
          {
            name: 'Bar',
            effect: Effect.Deny,
            actions: ['Bar:Action'],
            resources: ['000000000000'],
            condition: { StringEquals: { foo: 'bar' } },
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${PolicyScope}:${UpdatePolicy}`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(`Cannot execute "${UpdatePolicy}" on "${PolicyScope}"`);

      await expect(
        policyService.update(
          responsePolicy._id.toString(),
          {
            name: 'Bar',
            effect: Effect.Deny,
            actions: ['Bar:Action'],
            resources: ['000000000000'],
            condition: { StringEquals: { foo: 'bar' } },
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${UpdatePolicy}`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(`Cannot execute "${UpdatePolicy}" on "${PolicyScope}"`);

      await expect(
        policyService.update(
          responsePolicy._id.toString(),
          {
            name: 'Bar',
            effect: Effect.Deny,
            actions: ['Bar:Action'],
            resources: ['000000000000'],
            condition: { StringEquals: { foo: 'bar' } },
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${PolicyScope}:Action`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(`Cannot execute "${UpdatePolicy}" on "${PolicyScope}"`);
    });

    it('should update an policy based on condition', async () => {
      const responsePolicy = await new policyModel({
        name: 'Foo',
        effect: Effect.Allow,
        actions: ['Foo:Action'],
        resources: ['*'],
      }).save();

      const updatedPolicy = await policyService.update(
        responsePolicy._id.toString(),
        {
          name: 'Bar',
          effect: Effect.Deny,
          actions: ['Bar:Action'],
          resources: ['000000000000'],
          condition: { StringEquals: { foo: 'bar' } },
        },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${UpdatePolicy}`],
              resources: ['*'],
              condition: { StringEquals: { name: 'Foo' } },
            },
          ],
        },
      );
      expect(updatedPolicy.name).toBe('Bar');
      expect(updatedPolicy.effect).toBe(Effect.Deny);
      expect(updatedPolicy.actions).toEqual(['Bar:Action']);
      expect(updatedPolicy.resources).toEqual(['000000000000']);
      expect(updatedPolicy.condition).toEqual({
        StringEquals: { foo: 'bar' },
      });

      await expect(
        policyService.update(
          responsePolicy._id.toString(),
          {
            name: 'Bar',
            effect: Effect.Deny,
            actions: ['Bar:Action'],
            resources: ['000000000000'],
            condition: { StringEquals: { foo: 'bar' } },
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${PolicyScope}:${UpdatePolicy}`],
                resources: ['*'],
                condition: { StringEquals: { name: 'Baz' } },
              },
            ],
          },
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });

  describe('remove', () => {
    it('should remove a policy', async () => {
      await new policyModel(policy).save();

      await policyService.remove(policy._id.toString(), {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${RemovePolicy}`],
            resources: ['*'],
          },
        ],
      });
      expect((await policyModel.count()).valueOf()).toBe(0);
    });

    it('should fail to remove a policy if the policies are incorrect', async () => {
      await new policyModel(policy).save();

      await expect(
        policyService.remove(policy._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${PolicyScope}:${RemovePolicy}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${RemovePolicy}" on "${PolicyScope}"`);

      await expect(
        policyService.remove(policy._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${RemovePolicy}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${RemovePolicy}" on "${PolicyScope}"`);

      await expect(
        policyService.remove(policy._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:Action`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${RemovePolicy}" on "${PolicyScope}"`);
    });

    it('should remove a policy based on condition', async () => {
      await new policyModel(policy).save();

      await policyService.remove(policy._id.toString(), {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${RemovePolicy}`],
            resources: ['*'],
            condition: { StringEquals: { name: 'Foo' } },
          },
        ],
      });
      expect((await policyModel.count()).valueOf()).toBe(0);

      await new policyModel(policy).save();
      await expect(
        policyService.remove(policy._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${RemovePolicy}`],
              resources: ['*'],
              condition: { StringEquals: { name: 'Bar' } },
            },
          ],
        }),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });
});

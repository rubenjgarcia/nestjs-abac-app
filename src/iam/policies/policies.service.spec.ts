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
import {
  Organization,
  OrganizationSchema,
} from '../organizations/organizations.schema';
import { Unit, UnitSchema } from '../units/units.schema';

describe('PolicyService', () => {
  let policyService: PolicyService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let policyModel: Model<Policy>;
  let organizationModel: Model<Organization>;
  let unitModel: Model<Unit>;

  let organization: Organization;
  let unit: Unit;
  let policy: Policy;
  let policyBar: Policy;

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    policyModel = mongoConnection.model(Policy.name, PolicySchema);
    organizationModel = mongoConnection.model(
      Organization.name,
      OrganizationSchema,
    );
    unitModel = mongoConnection.model(Unit.name, UnitSchema);
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
    policy = {
      _id: new Types.ObjectId('000000000000'),
      name: 'Foo',
      effect: Effect.Allow,
      actions: ['Foo:Action'],
      resources: ['*'],
      unit,
    };
    policyBar = {
      _id: new Types.ObjectId('000000000001'),
      name: 'Bar',
      effect: Effect.Allow,
      actions: ['Bar:Action'],
      resources: ['*'],
      unit,
    };
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
        unit._id.toString(),
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
        unit._id.toString(),
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
          unit._id.toString(),
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
          unit._id.toString(),
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
          unit._id.toString(),
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
        unit._id.toString(),
      );
      expect(responsePolicy.name).toBe(policy.name);
      expect(responsePolicy.effect).toBe(policy.effect);
      expect(responsePolicy.actions).toEqual(policy.actions);
      expect(responsePolicy.resources).toEqual(policy.resources);
    });

    it('should fail to get a policy if the policies are incorrect', async () => {
      await new policyModel(policy).save();
      await expect(
        policyService.findOne(
          policy._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${PolicyScope}:${GetPolicy}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${GetPolicy}" on "${PolicyScope}"`);

      await expect(
        policyService.findOne(
          policy._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${GetPolicy}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${GetPolicy}" on "${PolicyScope}"`);

      await expect(
        policyService.findOne(
          policy._id.toString(),
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
          unit._id.toString(),
        ),
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
        unit._id.toString(),
      );
      expect(responsePolicy.name).toBe(policy.name);
      expect(responsePolicy.effect).toBe(policy.effect);
      expect(responsePolicy.actions).toEqual(policy.actions);
      expect(responsePolicy.resources).toEqual(policy.resources);

      await expect(
        policyService.findOne(
          policy._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${PolicyScope}:${GetPolicy}`],
                resources: ['*'],
                condition: { StringEquals: { name: 'Bar' } },
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });

    it('should fail to return a policy if the unit is not the same', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new policyModel({ ...policy, unit: unitBar }).save();
      await expect(
        policyService.findOne(
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
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });

  describe('findAll', () => {
    it('should return an array of policies', async () => {
      await new policyModel(policy).save();
      await new policyModel(policyBar).save();

      const responsePolicies = await policyService.findAll(
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${ListPolicies}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responsePolicies.length).toBe(2);
      expect(responsePolicies[0].name).toBe(policy.name);
      expect(responsePolicies[0].effect).toBe(policy.effect);
      expect(responsePolicies[0].actions).toEqual(policy.actions);
      expect(responsePolicies[0].resources).toEqual(policy.resources);
      expect(responsePolicies[1].name).toBe(policyBar.name);
      expect(responsePolicies[1].effect).toBe(policyBar.effect);
      expect(responsePolicies[1].actions).toEqual(policyBar.actions);
      expect(responsePolicies[1].resources).toEqual(policyBar.resources);
    });

    it('should return an array of policies based on condition', async () => {
      await new policyModel(policy).save();
      await new policyModel(policyBar).save();

      let responsePolicies = await policyService.findAll(
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${ListPolicies}`],
              resources: ['*'],
              condition: { StringEquals: { name: 'Foo' } },
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responsePolicies.length).toBe(1);
      expect(responsePolicies[0].name).toBe(policy.name);
      expect(responsePolicies[0].effect).toBe(policy.effect);
      expect(responsePolicies[0].actions).toEqual(policy.actions);
      expect(responsePolicies[0].resources).toEqual(policy.resources);

      responsePolicies = await policyService.findAll(
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${ListPolicies}`],
              resources: ['*'],
              condition: { StringEquals: { name: 'Baz' } },
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responsePolicies.length).toBe(0);
    });

    it('should fail to return an array of policies if the policies are incorrect', async () => {
      await new policyModel(policy).save();
      await new policyModel(policyBar).save();

      await expect(
        policyService.findAll(
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${PolicyScope}:${ListPolicies}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${ListPolicies}" on "${PolicyScope}"`);

      await expect(
        policyService.findAll(
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${ListPolicies}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${ListPolicies}" on "${PolicyScope}"`);

      await expect(
        policyService.findAll(
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
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${ListPolicies}" on "${PolicyScope}"`);
    });

    it('should return an array of policies based on unit', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new policyModel(policy).save();
      await new policyModel({ ...policyBar, unit: unitBar }).save();

      const responsePolicies = await policyService.findAll(
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${ListPolicies}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responsePolicies.length).toBe(1);
      expect(responsePolicies[0].name).toBe(policy.name);
      expect(responsePolicies[0].effect).toBe(policy.effect);
      expect(responsePolicies[0].actions).toEqual(policy.actions);
      expect(responsePolicies[0].resources).toEqual(policy.resources);
    });
  });

  describe('update', () => {
    it('should update policy', async () => {
      const responsePolicy = await new policyModel(policy).save();

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
        unit._id.toString(),
      );
      expect(updatedPolicy.name).toBe('Bar');
      expect(updatedPolicy.effect).toBe(Effect.Deny);
      expect(updatedPolicy.actions).toEqual(['Bar:Action']);
      expect(updatedPolicy.resources).toEqual(['000000000000']);
    });

    it('should update policy and put a condition', async () => {
      const responsePolicy = await new policyModel(policy).save();

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
        unit._id.toString(),
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
      const responsePolicy = await new policyModel(policy).save();

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
          unit._id.toString(),
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
          unit._id.toString(),
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
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${UpdatePolicy}" on "${PolicyScope}"`);
    });

    it('should update an policy based on condition', async () => {
      const responsePolicy = await new policyModel(policy).save();

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
        unit._id.toString(),
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
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });

    it('should fail to update policy if the entity is not the same', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      const responsePolicy = await new policyModel({
        ...policy,
        unit: unitBar,
      }).save();

      await expect(
        policyService.update(
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
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });

  describe('remove', () => {
    it('should remove a policy', async () => {
      await new policyModel(policy).save();

      await policyService.remove(
        policy._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${RemovePolicy}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect((await policyModel.count()).valueOf()).toBe(0);
    });

    it('should fail to remove a policy if the policies are incorrect', async () => {
      await new policyModel(policy).save();

      await expect(
        policyService.remove(
          policy._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${PolicyScope}:${RemovePolicy}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${RemovePolicy}" on "${PolicyScope}"`);

      await expect(
        policyService.remove(
          policy._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${RemovePolicy}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${RemovePolicy}" on "${PolicyScope}"`);

      await expect(
        policyService.remove(
          policy._id.toString(),
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
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${RemovePolicy}" on "${PolicyScope}"`);
    });

    it('should remove a policy based on condition', async () => {
      await new policyModel(policy).save();

      await policyService.remove(
        policy._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${RemovePolicy}`],
              resources: ['*'],
              condition: { StringEquals: { name: 'Foo' } },
            },
          ],
        },
        unit._id.toString(),
      );
      expect((await policyModel.count()).valueOf()).toBe(0);

      await new policyModel(policy).save();
      await expect(
        policyService.remove(
          policy._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${PolicyScope}:${RemovePolicy}`],
                resources: ['*'],
                condition: { StringEquals: { name: 'Bar' } },
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });

    it('should fail to remove a policy if the entity is not the same', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new policyModel({ ...policy, unit: unitBar }).save();

      await expect(
        policyService.remove(
          policy._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${PolicyScope}:${RemovePolicy}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });
});

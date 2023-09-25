import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Connection, connect, Model, Types } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UnitService } from './units.service';
import { Unit, UnitSchema } from './units.schema';
import {
  CaslAbilityFactory,
  Effect,
} from '../../framework/factories/casl-ability.factory';
import {
  CreateUnit,
  GetUnit,
  ListUnits,
  UnitScope,
  RemoveUnit,
  UpdateUnit,
  CreateChildUnit,
} from './units.actions';
import {
  Organization,
  OrganizationSchema,
} from '../organizations/organizations.schema';

describe('UnitService', () => {
  let unitService: UnitService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let unitModel: Model<Unit>;
  let organizationModel: Model<Organization>;

  let organization: Organization;
  let unit: Unit;
  let unitBar: Unit;

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    unitModel = mongoConnection.model(Unit.name, UnitSchema);
    organizationModel = mongoConnection.model(
      Organization.name,
      OrganizationSchema,
    );
    const module = await Test.createTestingModule({
      providers: [
        UnitService,
        CaslAbilityFactory,
        { provide: getModelToken(Unit.name), useValue: unitModel },
      ],
    }).compile();

    unitService = module.get<UnitService>(UnitService);
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
    unitBar = await new unitModel({
      _id: new Types.ObjectId('000000000001'),
      name: 'BarUnit',
      organization,
    }).save();
  });

  afterEach(async () => {
    await mongoConnection.dropDatabase();
  });

  describe('create', () => {
    it('should create a unit', async () => {
      const responseUnit = await unitService.create(
        { name: unit.name },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:${CreateUnit}`],
              resources: ['*'],
            },
          ],
        },
        organization._id.toString(),
      );
      expect(responseUnit._id).toBeDefined();
      expect(responseUnit.name).toBe(unit.name);
      expect(responseUnit.organization._id).toStrictEqual(organization._id);
      expect(responseUnit.ancestors.length).toBe(0);
    });

    it('should create a unit with condition', async () => {
      const responseUnit = await unitService.create(
        { name: unit.name },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:${CreateUnit}`],
              resources: ['*'],
              condition: { StringEquals: { name: unit.name } },
            },
          ],
        },
        organization._id.toString(),
      );
      expect(responseUnit._id).toBeDefined();
      expect(responseUnit.name).toBe(unit.name);
      expect(responseUnit.organization._id).toStrictEqual(organization._id);
      expect(responseUnit.ancestors.length).toBe(0);
    });

    it('should fail to create a unit if the policies are incorrect', async () => {
      await expect(
        unitService.create(
          { name: unit.name },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${UnitScope}:${CreateUnit}`],
                resources: ['*'],
              },
            ],
          },
          organization._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${CreateUnit}" on "${UnitScope}"`);

      await expect(
        unitService.create(
          unit,
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${CreateUnit}`],
                resources: ['*'],
              },
            ],
          },
          organization._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${CreateUnit}" on "${UnitScope}"`);

      await expect(
        unitService.create(
          unit,
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UnitScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          organization._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${CreateUnit}" on "${UnitScope}"`);
    });

    it('should create a unit with a parent unit', async () => {
      const parentUnit = await new unitModel(unit).save();
      const responseUnit = await unitService.create(
        { name: 'ChildUnit' },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:${CreateChildUnit}`],
              resources: ['*'],
            },
          ],
        },
        organization._id.toString(),
        parentUnit._id.toString(),
      );
      expect(responseUnit._id).toBeDefined();
      expect(responseUnit.name).toBe('ChildUnit');
      expect(responseUnit.organization._id).toStrictEqual(organization._id);
      expect(responseUnit.parent._id).toStrictEqual(parentUnit._id);
      expect(responseUnit.ancestors.length).toBe(1);
      expect(responseUnit.ancestors[0]._id).toStrictEqual(parentUnit._id);
    });

    it('should create a unit with a parent unit that has another parent unit', async () => {
      const grandparentUnit = await new unitModel(unit).save();
      const parentUnit = await new unitModel({
        name: 'ParenUnit',
        organization,
        parent: grandparentUnit._id,
        ancestors: [grandparentUnit._id],
      }).save();
      const responseUnit = await unitService.create(
        { name: 'ChildUnit' },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:${CreateChildUnit}`],
              resources: ['*'],
            },
          ],
        },
        organization._id.toString(),
        parentUnit._id.toString(),
      );
      expect(responseUnit._id).toBeDefined();
      expect(responseUnit.name).toBe('ChildUnit');
      expect(responseUnit.organization._id).toStrictEqual(organization._id);
      expect(responseUnit.parent._id).toStrictEqual(parentUnit._id);
      expect(responseUnit.ancestors.length).toBe(2);
      expect(responseUnit.ancestors[0]._id).toStrictEqual(grandparentUnit._id);
      expect(responseUnit.ancestors[1]._id).toStrictEqual(parentUnit._id);
    });

    it('should fail to create a unit with a parent unit if the policies are incorrect', async () => {
      const parentUnit = await new unitModel(unit).save();
      await expect(
        unitService.create(
          { name: 'ChildUnit' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UnitScope}:${CreateUnit}`],
                resources: ['*'],
              },
            ],
          },
          organization._id.toString(),
          parentUnit._id.toString(),
        ),
      ).rejects.toThrow(
        `Cannot execute "${CreateChildUnit}" on "${UnitScope}"`,
      );
    });
  });

  describe('findOne', () => {
    it('should return a unit', async () => {
      await new unitModel(unit).save();
      const responseUnit = await unitService.findOne(unit._id.toString(), {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${GetUnit}`],
            resources: ['*'],
          },
        ],
      });
      expect(responseUnit._id).toBeDefined();
      expect(responseUnit.name).toBe(unit.name);
    });

    it('should fail to get a unit if the policies are incorrect', async () => {
      await new unitModel(unit).save();
      await expect(
        unitService.findOne(unit._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${UnitScope}:${GetUnit}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${GetUnit}" on "${UnitScope}"`);

      await expect(
        unitService.findOne(unit._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${GetUnit}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${GetUnit}" on "${UnitScope}"`);

      await expect(
        unitService.findOne(unit._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:Action`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${GetUnit}" on "${UnitScope}"`);
    });

    it('should get a unit based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });
  });

  describe('findAll', () => {
    it('should return an array of units', async () => {
      await new unitModel(unit).save();
      await new unitModel(unitBar).save();

      const responseUnits = await unitService.findAll({
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${ListUnits}`],
            resources: ['*'],
          },
        ],
      });
      expect(responseUnits.length).toBe(2);
      expect(responseUnits[0]._id).toBeDefined();
      expect(responseUnits[0].name).toBe(unit.name);
      expect(responseUnits[1]._id).toBeDefined();
      expect(responseUnits[1].name).toBe(unitBar.name);
    });

    it('should return an array of units based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });

    it('should fail to return an array of units if the policies are incorrect', async () => {
      await new unitModel(unit).save();
      await new unitModel(unitBar).save();

      await expect(
        unitService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${UnitScope}:${ListUnits}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${ListUnits}" on "${UnitScope}"`);

      await expect(
        unitService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${ListUnits}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${ListUnits}" on "${UnitScope}"`);

      await expect(
        unitService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:Action`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${ListUnits}" on "${UnitScope}"`);
    });
  });

  describe('update', () => {
    it('should update unit', async () => {
      const responseUnit = await new unitModel(unit).save();

      const updatedUnit = await unitService.update(
        responseUnit._id.toString(),
        { name: 'BarUnit' },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:${UpdateUnit}`],
              resources: ['*'],
            },
          ],
        },
      );
      expect(updatedUnit._id).toBeDefined();
      expect(updatedUnit.name).toBe('BarUnit');
    });

    it('should fail to update a unit if the policies are incorrect', async () => {
      const responseUnit = await new unitModel(unit).save();

      await expect(
        unitService.update(
          responseUnit._id.toString(),
          { name: 'BarUnit' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${UnitScope}:${UpdateUnit}`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(`Cannot execute "${UpdateUnit}" on "${UnitScope}"`);

      await expect(
        unitService.update(
          responseUnit._id.toString(),
          { name: 'BarUnit' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${UpdateUnit}`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(`Cannot execute "${UpdateUnit}" on "${UnitScope}"`);

      await expect(
        unitService.update(
          responseUnit._id.toString(),
          { name: 'BarUnit' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${UnitScope}:Action`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(`Cannot execute "${UpdateUnit}" on "${UnitScope}"`);
    });

    it('should update an unit based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });
  });
});

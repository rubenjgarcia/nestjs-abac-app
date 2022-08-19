import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Connection, connect, Model, Types } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { OrganizationService } from './organizations.service';
import { Organization, OrganizationSchema } from './organizations.schema';
import {
  CaslAbilityFactory,
  Effect,
} from '../../framework/factories/casl-ability.factory';
import {
  CreateOrganization,
  GetOrganization,
  ListOrganizations,
  OrganizationScope,
  RemoveOrganization,
  UpdateOrganization,
} from './organizations.actions';

describe('OrganizationService', () => {
  let organizationService: OrganizationService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let organizationModel: Model<Organization>;

  const organization: Organization = {
    _id: new Types.ObjectId('000000000000'),
    name: 'Foo',
  };

  const organizations: Organization[] = [
    organization,
    {
      _id: new Types.ObjectId('000000000001'),
      name: 'Bar',
    },
  ];

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    organizationModel = mongoConnection.model(
      Organization.name,
      OrganizationSchema,
    );
    const module = await Test.createTestingModule({
      providers: [
        OrganizationService,
        CaslAbilityFactory,
        {
          provide: getModelToken(Organization.name),
          useValue: organizationModel,
        },
      ],
    }).compile();

    organizationService = module.get<OrganizationService>(OrganizationService);
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
    it('should create a organization', async () => {
      const responseOrganization = await organizationService.create(
        { name: 'Foo' },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:${CreateOrganization}`],
              resources: ['*'],
            },
          ],
        },
      );
      expect(responseOrganization._id).toBeDefined();
      expect(responseOrganization.name).toBe('Foo');
    });

    it('should create a organization with condition', async () => {
      const responseOrganization = await organizationService.create(
        { name: 'Foo' },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:${CreateOrganization}`],
              resources: ['*'],
            },
          ],
        },
      );
      expect(responseOrganization._id).toBeDefined();
      expect(responseOrganization.name).toBe('Foo');
    });

    it('should fail to create a organization if the organizations are incorrect', async () => {
      await expect(
        organizationService.create(
          { name: 'FooOrganization' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${OrganizationScope}:${CreateOrganization}`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(
        `Cannot execute "${CreateOrganization}" on "${OrganizationScope}"`,
      );

      await expect(
        organizationService.create(
          { name: 'FooOrganization' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${CreateOrganization}`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(
        `Cannot execute "${CreateOrganization}" on "${OrganizationScope}"`,
      );

      await expect(
        organizationService.create(
          { name: 'FooOrganization' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${OrganizationScope}:Action`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(
        `Cannot execute "${CreateOrganization}" on "${OrganizationScope}"`,
      );
    });
  });

  describe('findOne', () => {
    it('should return a organization', async () => {
      await new organizationModel(organization).save();
      const responseOrganization = await organizationService.findOne(
        organization._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:${GetOrganization}`],
              resources: ['*'],
            },
          ],
        },
      );
      expect(responseOrganization._id).toBeDefined();
    });

    it('should fail to get a organization if the organizations are incorrect', async () => {
      await new organizationModel(organization).save();
      await expect(
        organizationService.findOne(organization._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${OrganizationScope}:${GetOrganization}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(
        `Cannot execute "${GetOrganization}" on "${OrganizationScope}"`,
      );

      await expect(
        organizationService.findOne(organization._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${GetOrganization}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(
        `Cannot execute "${GetOrganization}" on "${OrganizationScope}"`,
      );

      await expect(
        organizationService.findOne(organization._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:Action`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(
        `Cannot execute "${GetOrganization}" on "${OrganizationScope}"`,
      );
    });

    it('should get a organization based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });
  });

  describe('findAll', () => {
    it('should return an array of organizations', async () => {
      await new organizationModel(organizations[0]).save();
      await new organizationModel(organizations[1]).save();

      const responseOrganizations = await organizationService.findAll({
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${ListOrganizations}`],
            resources: ['*'],
          },
        ],
      });
      expect(responseOrganizations.length).toBe(2);
      expect(responseOrganizations[0]._id).toBeDefined();
      expect(responseOrganizations[0].name).toBe('Foo');
      expect(responseOrganizations[1]._id).toBeDefined();
      expect(responseOrganizations[1].name).toBe('Bar');
    });

    it('should return an array of organizations based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });

    it('should fail to return an array of organizations if the organizations are incorrect', async () => {
      await new organizationModel(organizations[0]).save();
      await new organizationModel(organizations[1]).save();

      await expect(
        organizationService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${OrganizationScope}:${ListOrganizations}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(
        `Cannot execute "${ListOrganizations}" on "${OrganizationScope}"`,
      );

      await expect(
        organizationService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${ListOrganizations}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(
        `Cannot execute "${ListOrganizations}" on "${OrganizationScope}"`,
      );

      await expect(
        organizationService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:Action`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(
        `Cannot execute "${ListOrganizations}" on "${OrganizationScope}"`,
      );
    });
  });

  describe('update', () => {
    it('should update organization', async () => {
      const responseOrganization = await new organizationModel({
        name: 'Foo',
      }).save();

      const updatedOrganization = await organizationService.update(
        responseOrganization._id.toString(),
        { name: 'BarOrganization' },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:${UpdateOrganization}`],
              resources: ['*'],
            },
          ],
        },
      );
      expect(updatedOrganization._id).toBeDefined();
      expect(updatedOrganization.name).toBe('BarOrganization');
    });

    it('should update organization and put a condition', async () => {
      const responseOrganization = await new organizationModel({
        name: 'Foo',
      }).save();

      const updatedOrganization = await organizationService.update(
        responseOrganization._id.toString(),
        { name: 'BarOrganization' },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:${UpdateOrganization}`],
              resources: ['*'],
            },
          ],
        },
      );
      expect(updatedOrganization._id).toBeDefined();
      expect(updatedOrganization.name).toBe('BarOrganization');
    });

    it('should fail to update a organization if the organizations are incorrect', async () => {
      const responseOrganization = await new organizationModel({
        name: 'Foo',
      }).save();

      await expect(
        organizationService.update(
          responseOrganization._id.toString(),
          { name: 'BarOrganization' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${OrganizationScope}:${UpdateOrganization}`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(
        `Cannot execute "${UpdateOrganization}" on "${OrganizationScope}"`,
      );

      await expect(
        organizationService.update(
          responseOrganization._id.toString(),
          { name: 'BarOrganization' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${UpdateOrganization}`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(
        `Cannot execute "${UpdateOrganization}" on "${OrganizationScope}"`,
      );

      await expect(
        organizationService.update(
          responseOrganization._id.toString(),
          { name: 'BarOrganization' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${OrganizationScope}:Action`],
                resources: ['*'],
              },
            ],
          },
        ),
      ).rejects.toThrow(
        `Cannot execute "${UpdateOrganization}" on "${OrganizationScope}"`,
      );
    });

    it('should update an organization based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });
  });

  describe('remove', () => {
    it('should remove a organization', async () => {
      await new organizationModel(organization).save();

      await organizationService.remove(organization._id.toString(), {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${RemoveOrganization}`],
            resources: ['*'],
          },
        ],
      });
      expect((await organizationModel.count()).valueOf()).toBe(0);
    });

    it('should fail to remove a organization if the organizations are incorrect', async () => {
      await new organizationModel(organization).save();

      await expect(
        organizationService.remove(organization._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${OrganizationScope}:${RemoveOrganization}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(
        `Cannot execute "${RemoveOrganization}" on "${OrganizationScope}"`,
      );

      await expect(
        organizationService.remove(organization._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${RemoveOrganization}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(
        `Cannot execute "${RemoveOrganization}" on "${OrganizationScope}"`,
      );

      await expect(
        organizationService.remove(organization._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:Action`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(
        `Cannot execute "${RemoveOrganization}" on "${OrganizationScope}"`,
      );
    });

    it('should remove a organization based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });
  });
});

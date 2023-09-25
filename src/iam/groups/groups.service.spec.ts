import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Connection, connect, Model, Types } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { GroupService } from './groups.service';
import { Group, GroupSchema } from './groups.schema';
import {
  CaslAbilityFactory,
  Effect,
} from '../../framework/factories/casl-ability.factory';
import {
  CreateGroup,
  GetGroup,
  ListGroups,
  GroupScope,
  RemoveGroup,
  UpdateGroup,
} from './groups.actions';
import { Unit, UnitSchema } from '../units/units.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organizations/organizations.schema';

describe('GroupService', () => {
  let groupService: GroupService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let groupModel: Model<Group>;
  let organizationModel: Model<Organization>;
  let unitModel: Model<Unit>;

  let organization: Organization;
  let unit: Unit;
  let group: Group;
  let group2: Group;

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    groupModel = mongoConnection.model(Group.name, GroupSchema);
    organizationModel = mongoConnection.model(
      Organization.name,
      OrganizationSchema,
    );
    unitModel = mongoConnection.model(Unit.name, UnitSchema);
    const module = await Test.createTestingModule({
      providers: [
        GroupService,
        CaslAbilityFactory,
        { provide: getModelToken(Group.name), useValue: groupModel },
      ],
    }).compile();

    groupService = module.get<GroupService>(GroupService);
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
    group = {
      _id: new Types.ObjectId('000000000000'),
      name: 'FooGroup',
      unit,
    };
    group2 = {
      _id: new Types.ObjectId('000000000001'),
      name: 'BarGroup',
      unit,
    };
  });

  afterEach(async () => {
    await mongoConnection.dropDatabase();
  });

  describe('create', () => {
    it('should create a group', async () => {
      const responseGroup = await groupService.create(
        { name: 'FooGroup' },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${CreateGroup}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseGroup.id).toBeDefined();
      expect(responseGroup.unit).toBeDefined();
    });

    it('should create a group with condition', async () => {
      const responseGroup = await groupService.create(
        { name: 'FooGroup' },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${CreateGroup}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseGroup.id).toBeDefined();
      expect(responseGroup.unit).toBeDefined();
    });

    it('should fail to create a group if the policies are incorrect', async () => {
      await expect(
        groupService.create(
          { name: 'FooGroup' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${GroupScope}:${CreateGroup}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${CreateGroup}" on "${GroupScope}"`);

      await expect(
        groupService.create(
          { name: 'FooGroup' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${CreateGroup}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${CreateGroup}" on "${GroupScope}"`);

      await expect(
        groupService.create(
          { name: 'FooGroup' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${GroupScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${CreateGroup}" on "${GroupScope}"`);
    });
  });

  describe('findOne', () => {
    it('should return a group', async () => {
      await new groupModel(group).save();
      const responseGroup = await groupService.findOne(
        group._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${GetGroup}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseGroup.id).toBeDefined();
      expect(responseGroup.unit).toBeDefined();
      expect(responseGroup.name).toBe(group.name);
    });

    it('should fail to get a group if the policies are incorrect', async () => {
      await new groupModel(group).save();
      await expect(
        groupService.findOne(
          group._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${GroupScope}:${GetGroup}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${GetGroup}" on "${GroupScope}"`);

      await expect(
        groupService.findOne(
          group._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${GetGroup}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${GetGroup}" on "${GroupScope}"`);

      await expect(
        groupService.findOne(
          group._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${GroupScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${GetGroup}" on "${GroupScope}"`);
    });

    it('should get a group based on condition', async () => {
      await new groupModel(group).save();
      const responseGroup = await groupService.findOne(
        group._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${GetGroup}`],
              resources: ['*'],
              condition: { StringEquals: { name: 'FooGroup' } },
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseGroup.id).toBeDefined();
      expect(responseGroup.unit).toBeDefined();
      expect(responseGroup.name).toBe(group.name);
    });

    it('should fail to return a group if the unit is not the same', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new groupModel({ ...group, unit: unitBar }).save();
      await expect(
        groupService.findOne(
          group._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${GroupScope}:${GetGroup}`],
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
    it('should return an array of groups', async () => {
      await new groupModel(group).save();
      await new groupModel(group2).save();

      const responseGroups = await groupService.findAll(
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${ListGroups}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseGroups.length).toBe(2);
      expect(responseGroups[0].id).toBeDefined();
      expect(responseGroups[0].name).toBe(group.name);
      expect(responseGroups[1].id).toBeDefined();
      expect(responseGroups[1].name).toBe(group2.name);
    });

    it('should return an array of groups based on condition', async () => {
      await new groupModel(group).save();
      await new groupModel(group2).save();

      let responseGroups = await groupService.findAll(
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${ListGroups}`],
              resources: ['*'],
              condition: { StringEquals: { name: group.name } },
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseGroups.length).toBe(1);
      expect(responseGroups[0].id).toBeDefined();
      expect(responseGroups[0].name).toBe(group.name);

      responseGroups = await groupService.findAll(
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${ListGroups}`],
              resources: ['*'],
              condition: { StringEquals: { name: 'Bar' } },
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseGroups.length).toBe(0);
    });

    it('should fail to return an array of groups if the policies are incorrect', async () => {
      await new groupModel(group).save();
      await new groupModel(group2).save();

      await expect(
        groupService.findAll(
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${GroupScope}:${ListGroups}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${ListGroups}" on "${GroupScope}"`);

      await expect(
        groupService.findAll(
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${ListGroups}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${ListGroups}" on "${GroupScope}"`);

      await expect(
        groupService.findAll(
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${GroupScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${ListGroups}" on "${GroupScope}"`);
    });

    it('should return an array of groups based on unit', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new groupModel(group).save();
      await new groupModel({ ...group2, unit: unitBar }).save();

      const responseGroups = await groupService.findAll(
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${ListGroups}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseGroups.length).toBe(1);
      expect(responseGroups[0].id).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update group', async () => {
      const responseGroup = await new groupModel(group).save();

      const updatedGroup = await groupService.update(
        responseGroup._id.toString(),
        { name: 'BarGroup' },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${UpdateGroup}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(updatedGroup.id).toBeDefined();
      expect(updatedGroup.name).toBe('BarGroup');
    });

    it('should fail to update a group if the policies are incorrect', async () => {
      const responseGroup = await new groupModel(group).save();

      await expect(
        groupService.update(
          responseGroup._id.toString(),
          { name: 'BarGroup' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${GroupScope}:${UpdateGroup}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${UpdateGroup}" on "${GroupScope}"`);

      await expect(
        groupService.update(
          responseGroup._id.toString(),
          { name: 'BarGroup' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${UpdateGroup}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${UpdateGroup}" on "${GroupScope}"`);

      await expect(
        groupService.update(
          responseGroup._id.toString(),
          { name: 'BarGroup' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${GroupScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${UpdateGroup}" on "${GroupScope}"`);
    });

    it('should update a group based on condition', async () => {
      const responseGroup = await new groupModel(group).save();

      const updatedGroup = await groupService.update(
        responseGroup._id.toString(),
        { name: 'BarGroup' },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${UpdateGroup}`],
              resources: ['*'],
              condition: { StringEquals: { name: group.name } },
            },
          ],
        },
        unit._id.toString(),
      );
      expect(updatedGroup.id).toBeDefined();
      expect(updatedGroup.name).toBe('BarGroup');

      await expect(
        groupService.update(
          responseGroup._id.toString(),
          { name: 'BarGroup' },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${GroupScope}:${UpdateGroup}`],
                resources: ['*'],
                condition: { StringEquals: { name: 'Foo' } },
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });

    it('should fail to update group if the entity is not the same', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      const responseGroup = await new groupModel({
        ...group,
        unit: unitBar,
      }).save();

      await expect(
        groupService.update(
          responseGroup._id.toString(),
          {
            name: 'Foo2',
          },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${GroupScope}:${UpdateGroup}`],
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
    it('should remove a group', async () => {
      await new groupModel(group).save();

      await groupService.remove(
        group._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${RemoveGroup}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect((await groupModel.count()).valueOf()).toBe(0);
    });

    it('should fail to remove a group if the policies are incorrect', async () => {
      await new groupModel(group).save();

      await expect(
        groupService.remove(
          group._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${GroupScope}:${RemoveGroup}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${RemoveGroup}" on "${GroupScope}"`);

      await expect(
        groupService.remove(
          group._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${RemoveGroup}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${RemoveGroup}" on "${GroupScope}"`);

      await expect(
        groupService.remove(
          group._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${GroupScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${RemoveGroup}" on "${GroupScope}"`);
    });

    it('should remove a group based on condition', async () => {
      await new groupModel(group).save();

      await groupService.remove(
        group._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${RemoveGroup}`],
              resources: ['*'],
              condition: { StringEquals: { name: group.name } },
            },
          ],
        },
        unit._id.toString(),
      );
      expect((await groupModel.count()).valueOf()).toBe(0);

      await new groupModel(group).save();
      await expect(
        groupService.remove(
          group._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${GroupScope}:${RemoveGroup}`],
                resources: ['*'],
                condition: { StringEquals: { name: 'Bar' } },
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });

    it('should fail to remove a group if the entity is not the same', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new groupModel({ ...group, unit: unitBar }).save();

      await expect(
        groupService.remove(
          group._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${GroupScope}:${RemoveGroup}`],
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

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

describe('GroupService', () => {
  let groupService: GroupService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let groupModel: Model<Group>;

  const group: Group = {
    _id: new Types.ObjectId('000000000000'),
    name: 'FooGroup',
  };

  const groups: Group[] = [
    group,
    {
      _id: new Types.ObjectId('000000000001'),
      name: 'BarGroup',
    },
  ];

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    groupModel = mongoConnection.model(Group.name, GroupSchema);
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
      );
      expect(responseGroup.id).toBeDefined();
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
      );
      expect(responseGroup.id).toBeDefined();
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
        ),
      ).rejects.toThrow(`Cannot execute "${CreateGroup}" on "${GroupScope}"`);
    });
  });

  describe('findOne', () => {
    it('should return a group', async () => {
      await new groupModel(group).save();
      const responseGroup = await groupService.findOne(group._id.toString(), {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${GetGroup}`],
            resources: ['*'],
          },
        ],
      });
      expect(responseGroup.id).toBeDefined();
      expect(responseGroup.name).toBe(group.name);
    });

    it('should fail to get a group if the policies are incorrect', async () => {
      await new groupModel(group).save();
      await expect(
        groupService.findOne(group._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${GroupScope}:${GetGroup}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${GetGroup}" on "${GroupScope}"`);

      await expect(
        groupService.findOne(group._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${GetGroup}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${GetGroup}" on "${GroupScope}"`);

      await expect(
        groupService.findOne(group._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:Action`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${GetGroup}" on "${GroupScope}"`);
    });

    it('should get a group based on condition', async () => {
      await new groupModel(group).save();
      const responseGroup = await groupService.findOne(group._id.toString(), {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${GetGroup}`],
            resources: ['*'],
            condition: { StringEquals: { name: 'FooGroup' } },
          },
        ],
      });
      expect(responseGroup.id).toBeDefined();
      expect(responseGroup.name).toBe(group.name);

      await expect(
        groupService.findOne(group._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${GetGroup}`],
              resources: ['*'],
              condition: { StringEquals: { name: 'BarGroup' } },
            },
          ],
        }),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });

  describe('findAll', () => {
    it('should return an array of groups', async () => {
      await new groupModel(groups[0]).save();
      await new groupModel(groups[1]).save();

      const responseGroups = await groupService.findAll({
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${ListGroups}`],
            resources: ['*'],
          },
        ],
      });
      expect(responseGroups.length).toBe(2);
      expect(responseGroups[0].id).toBeDefined();
      expect(responseGroups[0].name).toBe(groups[0].name);
      expect(responseGroups[1].id).toBeDefined();
      expect(responseGroups[1].name).toBe(groups[1].name);
    });

    it('should return an array of groups based on condition', async () => {
      await new groupModel(groups[0]).save();
      await new groupModel(groups[1]).save();

      let responseGroups = await groupService.findAll({
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${ListGroups}`],
            resources: ['*'],
            condition: { StringEquals: { name: groups[0].name } },
          },
        ],
      });
      expect(responseGroups.length).toBe(1);
      expect(responseGroups[0].id).toBeDefined();
      expect(responseGroups[0].name).toBe(groups[0].name);

      responseGroups = await groupService.findAll({
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${ListGroups}`],
            resources: ['*'],
            condition: { StringEquals: { name: 'Bar' } },
          },
        ],
      });
      expect(responseGroups.length).toBe(0);
    });

    it('should fail to return an array of groups if the groups are incorrect', async () => {
      await new groupModel(groups[0]).save();
      await new groupModel(groups[1]).save();

      await expect(
        groupService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${GroupScope}:${ListGroups}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${ListGroups}" on "${GroupScope}"`);

      await expect(
        groupService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${ListGroups}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${ListGroups}" on "${GroupScope}"`);

      await expect(
        groupService.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:Action`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${ListGroups}" on "${GroupScope}"`);
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
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });

  describe('remove', () => {
    it('should remove a group', async () => {
      await new groupModel(group).save();

      await groupService.remove(group._id.toString(), {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${RemoveGroup}`],
            resources: ['*'],
          },
        ],
      });
      expect((await groupModel.count()).valueOf()).toBe(0);
    });

    it('should fail to remove a group if the groups are incorrect', async () => {
      await new groupModel(group).save();

      await expect(
        groupService.remove(group._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${GroupScope}:${RemoveGroup}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${RemoveGroup}" on "${GroupScope}"`);

      await expect(
        groupService.remove(group._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${RemoveGroup}`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${RemoveGroup}" on "${GroupScope}"`);

      await expect(
        groupService.remove(group._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:Action`],
              resources: ['*'],
            },
          ],
        }),
      ).rejects.toThrow(`Cannot execute "${RemoveGroup}" on "${GroupScope}"`);
    });

    it('should remove a group based on condition', async () => {
      await new groupModel(group).save();

      await groupService.remove(group._id.toString(), {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${RemoveGroup}`],
            resources: ['*'],
            condition: { StringEquals: { name: group.name } },
          },
        ],
      });
      expect((await groupModel.count()).valueOf()).toBe(0);

      await new groupModel(group).save();
      await expect(
        groupService.remove(group._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${RemoveGroup}`],
              resources: ['*'],
              condition: { StringEquals: { name: 'Bar' } },
            },
          ],
        }),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });
});

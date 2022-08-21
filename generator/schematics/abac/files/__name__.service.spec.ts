import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Connection, connect, Model, Types } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { <%= singular(classify(name)) %>Service } from './<%= name %>.service';
import { <%= singular(classify(name)) %>, <%= singular(classify(name)) %>Schema } from './<%= name %>.schema';
import {
  CaslAbilityFactory,
  Effect,
} from '../framework/factories/casl-ability.factory';
import {
  Create<%= singular(classify(name)) %>,
  Get<%= singular(classify(name)) %>,
  List<%= classify(name) %>,
  <%= singular(classify(name)) %>Scope,
  Remove<%= singular(classify(name)) %>,
  Update<%= singular(classify(name)) %>,
} from './<%= name %>.actions';
import { Unit, UnitSchema } from '../iam/units/units.schema';
import { Organization, OrganizationSchema } from '../iam/organizations/organizations.schema';

describe('<%= singular(classify(name)) %>Service', () => {
  let <%= singular(name) %>Service: <%= singular(classify(name)) %>Service;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let <%= singular(name) %>Model: Model<<%= singular(classify(name)) %>>;
  let organizationModel: Model<Organization>;
  let unitModel: Model<Unit>;

  let organization: Organization;
  let unit: Unit;
  let <%= singular(name) %>: <%= singular(classify(name)) %>;
  let <%= singular(name) %>2: <%= singular(classify(name)) %>;

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    <%= singular(name) %>Model = mongoConnection.model(<%= singular(classify(name)) %>.name, <%= singular(classify(name)) %>Schema);
    organizationModel = mongoConnection.model(
      Organization.name,
      OrganizationSchema,
    );
    unitModel = mongoConnection.model(Unit.name, UnitSchema);
    const module = await Test.createTestingModule({
      providers: [
        <%= singular(classify(name)) %>Service,
        CaslAbilityFactory,
        { provide: getModelToken(<%= singular(classify(name)) %>.name), useValue: <%= singular(name) %>Model },
      ],
    }).compile();

    <%= singular(name) %>Service = module.get<<%= singular(classify(name)) %>Service>(<%= singular(classify(name)) %>Service);
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
    <%= singular(name) %> = {
      _id: new Types.ObjectId('000000000000'),
      unit,
    };
    <%= singular(name) %>2 = {
      _id: new Types.ObjectId('000000000001'),
      unit,
    };
  });

  afterEach(async () => {
    await mongoConnection.dropDatabase();
  });

  describe('create', () => {
    it('should create a <%= singular(name) %>', async () => {
      const response<%= singular(classify(name)) %> = await <%= singular(name) %>Service.create(
        <%= singular(name) %>,
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Create<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(response<%= singular(classify(name)) %>.id).toBeDefined();
      expect(response<%= singular(classify(name)) %>.unit).toBeDefined();
    });

    it('should create a <%= singular(name) %> with condition', async () => {
      const response<%= singular(classify(name)) %> = await <%= singular(name) %>Service.create(
        <%= singular(name) %>,
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Create<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(response<%= singular(classify(name)) %>.id).toBeDefined();
      expect(response<%= singular(classify(name)) %>.unit).toBeDefined();
    });

    it('should fail to create a <%= singular(name) %> if the policies are incorrect', async () => {
      await expect(
        <%= singular(name) %>Service.create(
          <%= singular(name) %>,
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${<%= singular(classify(name)) %>Scope}:${Create<%= singular(classify(name)) %>}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${Create<%= singular(classify(name)) %>}" on "${<%= singular(classify(name)) %>Scope}"`);

      await expect(
        <%= singular(name) %>Service.create(
          <%= singular(name) %>,
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${Create<%= singular(classify(name)) %>}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${Create<%= singular(classify(name)) %>}" on "${<%= singular(classify(name)) %>Scope}"`);

      await expect(
        <%= singular(name) %>Service.create(
          <%= singular(name) %>,
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${<%= singular(classify(name)) %>Scope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${Create<%= singular(classify(name)) %>}" on "${<%= singular(classify(name)) %>Scope}"`);
    });
  });

  describe('findOne', () => {
    it('should return a <%= singular(name) %>', async () => {
      await new <%= singular(name) %>Model(<%= singular(name) %>).save();
      const response<%= singular(classify(name)) %> = await <%= singular(name) %>Service.findOne(
        <%= singular(name) %>._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Get<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(response<%= singular(classify(name)) %>.id).toBeDefined();
      expect(response<%= singular(classify(name)) %>.unit).toBeDefined();
    });

    it('should fail to get a <%= singular(name) %> if the policies are incorrect', async () => {
      await new <%= singular(name) %>Model(<%= singular(name) %>).save();
      await expect(
        <%= singular(name) %>Service.findOne(<%= singular(name) %>._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Get<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${Get<%= singular(classify(name)) %>}" on "${<%= singular(classify(name)) %>Scope}"`);

      await expect(
        <%= singular(name) %>Service.findOne(<%= singular(name) %>._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${Get<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
          ],
        }, unit._id.toString(),),
      ).rejects.toThrow(`Cannot execute "${Get<%= singular(classify(name)) %>}" on "${<%= singular(classify(name)) %>Scope}"`);

      await expect(
        <%= singular(name) %>Service.findOne(<%= singular(name) %>._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:Action`],
              resources: ['*'],
            },
          ],
        }, unit._id.toString(),),
      ).rejects.toThrow(`Cannot execute "${Get<%= singular(classify(name)) %>}" on "${<%= singular(classify(name)) %>Scope}"`);
    });

    it('should get a <%= singular(name) %> based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });

    it('should fail to return a <%= singular(name) %> if the unit is not the same', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new <%= singular(name) %>Model({ ...<%= singular(name) %>, unit: unitBar }).save();
      await expect(
        <%= singular(name) %>Service.findOne(
          <%= singular(name) %>._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${<%= singular(classify(name)) %>Scope}:${Get<%= singular(classify(name)) %>}`],
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
    it('should return an array of <%= name %>', async () => {
      await new <%= singular(name) %>Model(<%= singular(name) %>).save();
      await new <%= singular(name) %>Model(<%= singular(name) %>2).save();

      const response<%= classify(name) %> = await <%= singular(name) %>Service.findAll({
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${List<%= classify(name) %>}`],
            resources: ['*'],
          },
        ],
      }, unit._id.toString(),);
      expect(response<%= classify(name) %>.length).toBe(2);
      expect(response<%= classify(name) %>[0].id).toBeDefined();
      expect(response<%= classify(name) %>[1].id).toBeDefined();
    });

    it('should return an array of <%= name %> based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });

    it('should fail to return an array of <%= name %> if the <%= name %> are incorrect', async () => {
      await new <%= singular(name) %>Model(<%= singular(name) %>).save();
      await new <%= singular(name) %>Model(<%= singular(name) %>2).save();

      await expect(
        <%= singular(name) %>Service.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${<%= singular(classify(name)) %>Scope}:${List<%= classify(name) %>}`],
              resources: ['*'],
            },
          ],
        }, unit._id.toString(),),
      ).rejects.toThrow(`Cannot execute "${List<%= classify(name) %>}" on "${<%= singular(classify(name)) %>Scope}"`);

      await expect(
        <%= singular(name) %>Service.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${List<%= classify(name) %>}`],
              resources: ['*'],
            },
          ],
        }, unit._id.toString(),),
      ).rejects.toThrow(`Cannot execute "${List<%= classify(name) %>}" on "${<%= singular(classify(name)) %>Scope}"`);

      await expect(
        <%= singular(name) %>Service.findAll({
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:Action`],
              resources: ['*'],
            },
          ],
        }, unit._id.toString(),),
      ).rejects.toThrow(`Cannot execute "${List<%= classify(name) %>}" on "${<%= singular(classify(name)) %>Scope}"`);
    });

    it('should return an array of <%= name %> based on unit', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new <%= singular(name) %>Model(<%= singular(name) %>).save();
      await new <%= singular(name) %>Model({ ...<%= singular(name) %>2, unit: unitBar }).save();

      const response<%= classify(name) %> = await <%= singular(name) %>Service.findAll({
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${List<%= classify(name) %>}`],
            resources: ['*'],
          },
        ],
      }, unit._id.toString(),);
      expect(response<%= classify(name) %>.length).toBe(1);
      expect(response<%= classify(name) %>[0].id).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update <%= singular(name) %>', async () => {
      const response<%= singular(classify(name)) %> = await new <%= singular(name) %>Model(<%= singular(name) %>).save();

      const updated<%= singular(classify(name)) %> = await <%= singular(name) %>Service.update(
        response<%= singular(classify(name)) %>._id.toString(),
        { },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Update<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(updated<%= singular(classify(name)) %>.id).toBeDefined();
    });

    it('should fail to update a <%= singular(name) %> if the policies are incorrect', async () => {
      const response<%= singular(classify(name)) %> = await new <%= singular(name) %>Model(<%= singular(name) %>).save();

      await expect(
        <%= singular(name) %>Service.update(
          response<%= singular(classify(name)) %>._id.toString(),
          { },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${<%= singular(classify(name)) %>Scope}:${Update<%= singular(classify(name)) %>}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${Update<%= singular(classify(name)) %>}" on "${<%= singular(classify(name)) %>Scope}"`);

      await expect(
        <%= singular(name) %>Service.update(
          response<%= singular(classify(name)) %>._id.toString(),
          { },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${Update<%= singular(classify(name)) %>}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${Update<%= singular(classify(name)) %>}" on "${<%= singular(classify(name)) %>Scope}"`);

      await expect(
        <%= singular(name) %>Service.update(
          response<%= singular(classify(name)) %>._id.toString(),
          { },
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${<%= singular(classify(name)) %>Scope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${Update<%= singular(classify(name)) %>}" on "${<%= singular(classify(name)) %>Scope}"`);
    });

    it('should update a <%= singular(name) %> based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });

    it('should fail to update <%= singular(name) %> if the entity is not the same', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      const response<%= singular(classify(name)) %> = await new <%= singular(name) %>Model({ ...<%= singular(name) %>, unit: unitBar, }).save();

      await expect( <%= singular(name) %>Service.update(
        response<%= singular(classify(name)) %>._id.toString(),
        { },
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Update<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      )).rejects.toThrow(/No document found for query.*/);
    });
  });

  describe('remove', () => {
    it('should remove a <%= singular(name) %>', async () => {
      await new <%= singular(name) %>Model(<%= singular(name) %>).save();

      await <%= singular(name) %>Service.remove(<%= singular(name) %>._id.toString(), {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Remove<%= singular(classify(name)) %>}`],
            resources: ['*'],
          },
        ],
      }, unit._id.toString(),);
      expect((await <%= singular(name) %>Model.count()).valueOf()).toBe(0);
    });

    it('should fail to remove a <%= singular(name) %> if the policies are incorrect', async () => {
      await new <%= singular(name) %>Model(<%= singular(name) %>).save();

      await expect(
        <%= singular(name) %>Service.remove(<%= singular(name) %>._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Deny,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Remove<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
          ],
        }, unit._id.toString(),),
      ).rejects.toThrow(`Cannot execute "${Remove<%= singular(classify(name)) %>}" on "${<%= singular(classify(name)) %>Scope}"`);

      await expect(
        <%= singular(name) %>Service.remove(<%= singular(name) %>._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`Foo:${Remove<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
          ],
        }, unit._id.toString(),),
      ).rejects.toThrow(`Cannot execute "${Remove<%= singular(classify(name)) %>}" on "${<%= singular(classify(name)) %>Scope}"`);

      await expect(
        <%= singular(name) %>Service.remove(<%= singular(name) %>._id.toString(), {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:Action`],
              resources: ['*'],
            },
          ],
        }, unit._id.toString(),),
      ).rejects.toThrow(`Cannot execute "${Remove<%= singular(classify(name)) %>}" on "${<%= singular(classify(name)) %>Scope}"`);
    });

    it('should remove a <%= singular(name) %> based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });

    it('should fail to remove a <%= singular(name) %> if the entity is not the same', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new <%= singular(name) %>Model({ ...<%= singular(name) %>, unit: unitBar }).save();

      await expect(
        <%= singular(name) %>Service.remove(
          <%= singular(name) %>._id.toString(), 
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${<%= singular(classify(name)) %>Scope}:${Remove<%= singular(classify(name)) %>}`],
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

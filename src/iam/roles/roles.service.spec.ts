import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Connection, connect, Model, Types } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { RoleService } from './roles.service';
import { Role, RoleSchema } from './roles.schema';
import {
  CaslAbilityFactory,
  Effect,
} from '../../framework/factories/casl-ability.factory';
import {
  CreateRole,
  GetRole,
  ListRoles,
  RoleScope,
  RemoveRole,
  UpdateRole,
  AddRoleToUser,
  RemoveRoleFromUser,
} from './roles.actions';
import { Unit, UnitSchema } from '../units/units.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organizations/organizations.schema';
import { User, UserSchema } from '../users/users.schema';

describe('RoleService', () => {
  let roleService: RoleService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let roleModel: Model<Role>;
  let organizationModel: Model<Organization>;
  let unitModel: Model<Unit>;
  let userModel: Model<User>;

  let organization: Organization;
  let unit: Unit;
  let role: Role;
  let role2: Role;

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    roleModel = mongoConnection.model(Role.name, RoleSchema);
    organizationModel = mongoConnection.model(
      Organization.name,
      OrganizationSchema,
    );
    unitModel = mongoConnection.model(Unit.name, UnitSchema);
    userModel = mongoConnection.model(User.name, UserSchema);
    const module = await Test.createTestingModule({
      providers: [
        RoleService,
        CaslAbilityFactory,
        { provide: getModelToken(Role.name), useValue: roleModel },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    roleService = module.get<RoleService>(RoleService);
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
    role = {
      _id: new Types.ObjectId('000000000000'),
      name: 'FooRole',
      unit,
    };
    role2 = {
      _id: new Types.ObjectId('000000000001'),
      name: 'BarRole',
      unit,
    };
  });

  afterEach(async () => {
    await mongoConnection.dropDatabase();
  });

  describe('create', () => {
    it('should create a role', async () => {
      const responseRole = await roleService.create(
        role,
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${CreateRole}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseRole.id).toBeDefined();
      expect(responseRole.unit).toBeDefined();
    });

    it('should create a role with condition', async () => {
      const responseRole = await roleService.create(
        role,
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${CreateRole}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseRole.id).toBeDefined();
      expect(responseRole.unit).toBeDefined();
    });

    it('should fail to create a role if the policies are incorrect', async () => {
      await expect(
        roleService.create(
          role,
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${RoleScope}:${CreateRole}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${CreateRole}" on "${RoleScope}"`);

      await expect(
        roleService.create(
          role,
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${CreateRole}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${CreateRole}" on "${RoleScope}"`);

      await expect(
        roleService.create(
          role,
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${RoleScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${CreateRole}" on "${RoleScope}"`);
    });
  });

  describe('findOne', () => {
    it('should return a role', async () => {
      await new roleModel(role).save();
      const responseRole = await roleService.findOne(
        role._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${GetRole}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseRole.id).toBeDefined();
      expect(responseRole.unit).toBeDefined();
    });

    it('should fail to get a role if the policies are incorrect', async () => {
      await new roleModel(role).save();
      await expect(
        roleService.findOne(
          role._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${RoleScope}:${GetRole}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${GetRole}" on "${RoleScope}"`);

      await expect(
        roleService.findOne(
          role._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${GetRole}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${GetRole}" on "${RoleScope}"`);

      await expect(
        roleService.findOne(
          role._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${RoleScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${GetRole}" on "${RoleScope}"`);
    });

    it('should get a role based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });

    it('should fail to return a role if the unit is not the same', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new roleModel({ ...role, unit: unitBar }).save();
      await expect(
        roleService.findOne(
          role._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${RoleScope}:${GetRole}`],
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
    it('should return an array of roles', async () => {
      await new roleModel(role).save();
      await new roleModel(role2).save();

      const responseRoles = await roleService.findAll(
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${ListRoles}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseRoles.length).toBe(2);
      expect(responseRoles[0].id).toBeDefined();
      expect(responseRoles[1].id).toBeDefined();
    });

    it('should return an array of roles based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });

    it('should fail to return an array of roles if the roles are incorrect', async () => {
      await new roleModel(role).save();
      await new roleModel(role2).save();

      await expect(
        roleService.findAll(
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${RoleScope}:${ListRoles}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${ListRoles}" on "${RoleScope}"`);

      await expect(
        roleService.findAll(
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${ListRoles}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${ListRoles}" on "${RoleScope}"`);

      await expect(
        roleService.findAll(
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${RoleScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${ListRoles}" on "${RoleScope}"`);
    });

    it('should return an array of roles based on unit', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new roleModel(role).save();
      await new roleModel({ ...role2, unit: unitBar }).save();

      const responseRoles = await roleService.findAll(
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${ListRoles}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(responseRoles.length).toBe(1);
      expect(responseRoles[0].id).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update role', async () => {
      const responseRole = await new roleModel(role).save();

      const updatedRole = await roleService.update(
        responseRole._id.toString(),
        {},
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${UpdateRole}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect(updatedRole.id).toBeDefined();
    });

    it('should fail to update a role if the policies are incorrect', async () => {
      const responseRole = await new roleModel(role).save();

      await expect(
        roleService.update(
          responseRole._id.toString(),
          {},
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${RoleScope}:${UpdateRole}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${UpdateRole}" on "${RoleScope}"`);

      await expect(
        roleService.update(
          responseRole._id.toString(),
          {},
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${UpdateRole}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${UpdateRole}" on "${RoleScope}"`);

      await expect(
        roleService.update(
          responseRole._id.toString(),
          {},
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${RoleScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${UpdateRole}" on "${RoleScope}"`);
    });

    it('should update a role based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });

    it('should fail to update role if the entity is not the same', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      const responseRole = await new roleModel({
        ...role,
        unit: unitBar,
      }).save();

      await expect(
        roleService.update(
          responseRole._id.toString(),
          {},
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${RoleScope}:${UpdateRole}`],
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
    it('should remove a role', async () => {
      await new roleModel(role).save();

      await roleService.remove(
        role._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${RemoveRole}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      expect((await roleModel.count()).valueOf()).toBe(0);
    });

    it('should fail to remove a role if the policies are incorrect', async () => {
      await new roleModel(role).save();

      await expect(
        roleService.remove(
          role._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Deny,
                actions: [`${RoleScope}:${RemoveRole}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${RemoveRole}" on "${RoleScope}"`);

      await expect(
        roleService.remove(
          role._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`Foo:${RemoveRole}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${RemoveRole}" on "${RoleScope}"`);

      await expect(
        roleService.remove(
          role._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${RoleScope}:Action`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(`Cannot execute "${RemoveRole}" on "${RoleScope}"`);
    });

    it('should remove a role based on condition', async () => {
      //TODO Must implement this test after create the real schema
    });

    it('should fail to remove a role if the entity is not the same', async () => {
      const unitBar = await new unitModel({
        _id: new Types.ObjectId('000000000001'),
        name: 'BarUnit',
        organization,
      }).save();
      await new roleModel({ ...role, unit: unitBar }).save();

      await expect(
        roleService.remove(
          role._id.toString(),
          {
            policies: [
              {
                name: 'FooPolicy',
                effect: Effect.Allow,
                actions: [`${RoleScope}:${RemoveRole}`],
                resources: ['*'],
              },
            ],
          },
          unit._id.toString(),
        ),
      ).rejects.toThrow(/No document found for query.*/);
    });
  });

  describe('addRoleToUser', () => {
    it('should be able to add a role to an user', async () => {
      const user = await new userModel({
        email: 'foo@example.com',
        password: 'foo',
        unit,
      }).save();
      const responseRole = await new roleModel(role).save();

      await roleService.addRoleToUser(
        responseRole._id.toString(),
        user._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${AddRoleToUser}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      const userResponse = await userModel.findById(user._id);
      expect(userResponse.roles.length).toBe(1);
      expect(userResponse.roles[0]._id).toStrictEqual(responseRole._id);
    });
  });

  describe('removeRoleFromUser', () => {
    it('should be able to remove a role from an user', async () => {
      const responseRole = await new roleModel(role).save();
      const user = await new userModel({
        email: 'foo@example.com',
        password: 'foo',
        unit,
        roles: [responseRole],
      }).save();

      await roleService.removeRoleFromUser(
        responseRole._id.toString(),
        user._id.toString(),
        {
          policies: [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${RemoveRoleFromUser}`],
              resources: ['*'],
            },
          ],
        },
        unit._id.toString(),
      );
      const userResponse = await userModel.findById(user._id);
      expect(userResponse.roles.length).toBe(0);
    });
  });
});

import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection, connect, Model } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { RolesModule } from './roles.module';
import { AuthModule } from '../auth/auth.module';
import { E2EUtils } from '../../framework/tests/e2e-utils';
import { Effect } from '../../framework/factories/casl-ability.factory';
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
import { Role, RoleSchema } from './roles.schema';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { Policy, PolicySchema } from '../policies/policies.schema';
import { User, UserSchema } from '../users/users.schema';
import { Unit, UnitSchema } from '../units/units.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organizations/organizations.schema';

describe('Roles e2e', () => {
  let app: INestApplication;
  let e2eUtils: E2EUtils;
  let roleModel: Model<Role>;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  const createRole = async (role: CreateRoleDto): Promise<Role> => {
    return await new roleModel({
      ...role,
      unit: await e2eUtils.getUnit(),
    }).save();
  };

  const createRoleDto: CreateRoleDto = { name: 'FooRole' };
  const updateRoleDto: UpdateRoleDto = { name: 'BarRole' };

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    const module = await Test.createTestingModule({
      imports: [
        AuthModule,
        RolesModule,
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
          imports: [
            MongooseModule.forFeature([
              { name: User.name, schema: UserSchema },
              { name: Policy.name, schema: PolicySchema },
            ]),
            JwtModule.registerAsync({
              imports: [ConfigModule],
              inject: [ConfigService],
              useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '7d' },
              }),
            }),
          ],
          inject: [JwtService],
          useFactory: async (jwtService: JwtService) => {
            mongod = await MongoMemoryServer.create();
            const uri = await mongod.getUri();
            mongoConnection = (await connect(uri)).connection;
            const userModel = mongoConnection.model(User.name, UserSchema);
            const policyModel = mongoConnection.model(
              Policy.name,
              PolicySchema,
            );
            const unitModel = mongoConnection.model(Unit.name, UnitSchema);
            const organizationModel = mongoConnection.model(
              Organization.name,
              OrganizationSchema,
            );
            e2eUtils = new E2EUtils(
              userModel,
              policyModel,
              unitModel,
              organizationModel,
              jwtService,
            );
            roleModel = mongoConnection.model(Role.name, RoleSchema);
            return { uri };
          },
        }),
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await Promise.all([mongoConnection.close(), mongod.stop(), app.close()]);
  });

  describe('Roles API', () => {
    afterEach(async () => {
      await mongoConnection.dropDatabase();
    });

    describe('GET /iam/roles', () => {
      it("should fail to get roles if user it's not logged in", async () => {
        await request(app.getHttpServer()).get('/iam/roles').expect(401);
      });

      it('should fail to get roles if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/iam/roles')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get roles if user has wildcard resource in policy', async () => {
        await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${ListRoles}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .get('/iam/roles')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.length).toBe(1);
      });

      it('should fail to get roles if user has no wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${ListRoles}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/roles')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get roles if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${RoleScope}:${ListRoles}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/roles')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get roles if user has deny effect and no wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${RoleScope}:${ListRoles}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/roles')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });
    });

    describe('GET /iam/roles/{id}', () => {
      it("should fail to get role if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .get('/iam/roles/000000000001')
          .expect(401);
      });

      it('should fail to get role if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/iam/roles/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get roles if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${GetRole}`],
            resources: ['*'],
          },
        );
        const savedRole = await createRole(createRoleDto);
        const response = await request(app.getHttpServer())
          .get(`/iam/roles/${savedRole._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
      });

      it('should fail to get role if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${RoleScope}:${GetRole}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/roles/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get role if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${GetRole}`],
            resources: [savedRole._id.toString()],
          },
        );
        const response = await request(app.getHttpServer())
          .get(`/iam/roles/${savedRole._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
      });

      it('should fail to get role if user has deny effect and no wildcard resource in policy', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${RoleScope}:${GetRole}`],
            resources: [savedRole._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .get(`/iam/roles/${savedRole._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get role if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${GetRole}`],
              resources: [savedRole._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${RoleScope}:${GetRole}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .get(`/iam/roles/${savedRole._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get role if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${GetRole}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${RoleScope}:${GetRole}`],
              resources: [savedRole._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .get(`/iam/roles/${savedRole._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get role if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${GetRole}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${RoleScope}:${GetRole}`],
              resources: ['000000000000'],
            },
          ],
        );
        const response = await request(app.getHttpServer())
          .get(`/iam/roles/${savedRole._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
      });
    });

    describe('POST /iam/roles', () => {
      it("should fail to create role if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .post('/iam/roles')
          .send(createRoleDto)
          .expect(401);
      });

      it('should fail to create role if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .post('/iam/roles')
          .send(createRoleDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should create role if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${CreateRole}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .post('/iam/roles')
          .send(createRoleDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(201);
        expect(response.body._id).toBeDefined();
      });

      it('should fail to create role if user has resource informed in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${CreateRole}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .post('/iam/roles')
          .send(createRoleDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to create role if the fields are not correct', async () => {
        //TODO Must implement this test after create the real schema
      });
    });

    describe('PUT /iam/roles/{id}', () => {
      it("should fail to update role if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .put('/iam/roles/000000000001')
          .send(updateRoleDto)
          .expect(401);
      });

      it('should fail to update role if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .put('/iam/roles/000000000001')
          .send(updateRoleDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update role if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${UpdateRole}`],
            resources: ['*'],
          },
        );
        const savedRole = await createRole(createRoleDto);
        const response = await request(app.getHttpServer())
          .put(`/iam/roles/${savedRole._id}`)
          .send(updateRoleDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBe(savedRole._id.toString());
      });

      it('should fail to update role if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${RoleScope}:${UpdateRole}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .put('/iam/roles/000000000001')
          .send(updateRoleDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update role if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${UpdateRole}`],
            resources: [savedRole._id.toString()],
          },
        );
        const response = await request(app.getHttpServer())
          .put(`/iam/roles/${savedRole._id}`)
          .send(updateRoleDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
      });

      it('should fail to update role if user has deny effect and no wildcard resource in policy', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${RoleScope}:${UpdateRole}`],
            resources: [savedRole._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .put(`/iam/roles/${savedRole._id}`)
          .send(createRoleDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${UpdateRole}`],
              resources: [savedRole._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${RoleScope}:${UpdateRole}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .put(`/iam/roles/${savedRole._id}`)
          .send(createRoleDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update role if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${UpdateRole}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${RoleScope}:${UpdateRole}`],
              resources: [savedRole._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .put(`/iam/roles/${savedRole._id}`)
          .send(createRoleDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update role if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${UpdateRole}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${RoleScope}:${UpdateRole}`],
              resources: ['000000000000'],
            },
          ],
        );
        const response = await request(app.getHttpServer())
          .put(`/iam/roles/${savedRole._id}`)
          .send(updateRoleDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
      });

      it('should fail to update role if the fields are not correct', async () => {
        //TODO Must implement this test after create the real schema
      });
    });

    describe('DELETE /iam/roles/{id}', () => {
      it("should fail to remove role if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .delete('/iam/roles/000000000001')
          .expect(401);
      });

      it('should fail to remove role if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .delete('/iam/roles/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove role if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${RemoveRole}`],
            resources: ['*'],
          },
        );
        const savedRole = await createRole(createRoleDto);
        await request(app.getHttpServer())
          .delete(`/iam/roles/${savedRole._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove role if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${RoleScope}:${RemoveRole}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .delete('/iam/roles/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove role if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${RemoveRole}`],
            resources: [savedRole._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .delete(`/iam/roles/${savedRole._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove role if user has deny effect and no wildcard resource in policy', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${RoleScope}:${RemoveRole}`],
            resources: [savedRole._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .delete(`/iam/roles/${savedRole._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${RemoveRole}`],
              resources: [savedRole._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${RoleScope}:${RemoveRole}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/roles/${savedRole._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove role if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${RemoveRole}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${RoleScope}:${RemoveRole}`],
              resources: [savedRole._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/roles/${savedRole._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove role if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedRole = await createRole(createRoleDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${RoleScope}:${RemoveRole}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${RoleScope}:${RemoveRole}`],
              resources: ['000000000000'],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/roles/${savedRole._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });
    });

    describe('POST /iam/roles/{roleId}/addToUser/{userId}', () => {
      it("should fail to add a role to an user if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .post('/iam/roles/000000000001/addToUser/000000000002')
          .expect(401);
      });

      it('should fail to add a role to an user if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .post('/iam/roles/000000000001/addToUser/000000000002')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should be able to add a role to an user if user has wildcard resource in policy', async () => {
        const user = await e2eUtils.createUser(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${AddRoleToUser}`],
            resources: ['*'],
          },
        );
        const accessToken = await e2eUtils.login(user);
        const savedRole = await createRole(createRoleDto);
        await request(app.getHttpServer())
          .post(`/iam/roles/${savedRole._id}/addToUser/${user._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });
    });

    describe('DELETE /iam/roles/{roleId}/removeFromUser/{userId}', () => {
      it("should fail to remove a role from an user if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .delete('/iam/roles/000000000001/removeFromUser/000000000002')
          .expect(401);
      });

      it('should fail to remove a role from an user if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .delete('/iam/roles/000000000001/removeFromUser/000000000002')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should be able to remove a role from an user if user has wildcard resource in policy', async () => {
        const user = await e2eUtils.createUser(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${RemoveRoleFromUser}`],
            resources: ['*'],
          },
        );
        const accessToken = await e2eUtils.login(user);
        const savedRole = await createRole(createRoleDto);
        await request(app.getHttpServer())
          .delete(`/iam/roles/${savedRole._id}/removeFromUser/${user._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });
    });
  });
});

import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection, connect, Model } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { OrganizationsModule } from './organizations.module';
import { AuthModule } from '../auth/auth.module';
import { E2EUtils } from '../../framework/tests/e2e-utils';
import { Effect } from '../../framework/factories/casl-ability.factory';
import {
  CreateOrganization,
  GetOrganization,
  ListOrganizations,
  OrganizationScope,
  RemoveOrganization,
  UpdateOrganization,
} from './organizations.actions';
import { Organization, OrganizationSchema } from './organizations.schema';
import { CreateOrganizationDto } from './dtos/create-organization.dto';
import { Policy, PolicySchema } from '../policies/policies.schema';
import { User, UserSchema } from '../users/users.schema';
import { UpdateOrganizationDto } from './dtos/update-organization.dto';
import { Unit, UnitSchema } from '../units/units.schema';

describe('Organizations e2e', () => {
  let app: INestApplication;
  let e2eUtils: E2EUtils;
  let organizationModel: Model<Organization>;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  const createOrganization = async (
    organization: CreateOrganizationDto,
  ): Promise<Organization> => {
    return await new organizationModel(organization).save();
  };

  const createOrganizationDto: CreateOrganizationDto = {
    name: 'Foo',
  };

  const updateOrganizationDto: UpdateOrganizationDto = {
    name: 'Bar',
  };

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    const module = await Test.createTestingModule({
      imports: [
        AuthModule,
        OrganizationsModule,
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
            organizationModel = mongoConnection.model(
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

  describe('Organizations API', () => {
    afterEach(async () => {
      await mongoConnection.dropDatabase();
    });

    describe('GET /iam/organizations', () => {
      it("should fail to get organizations if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .get('/iam/organizations')
          .expect(401);
      });

      it('should fail to get organizations if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/iam/organizations')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get organizations if user has wildcard resource in policy', async () => {
        await createOrganization(createOrganizationDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${ListOrganizations}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .get('/iam/organizations')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.length).toBe(2); // e2eUtils creates another one
        expect(response.body[0].name).toBe(createOrganizationDto.name);
      });

      it('should fail to get organizations if user has no wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${ListOrganizations}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/organizations')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get organizations if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${OrganizationScope}:${ListOrganizations}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/organizations')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get organizations if user has deny effect and no wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${OrganizationScope}:${ListOrganizations}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/organizations')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });
    });

    describe('GET /iam/organizations/{id}', () => {
      it("should fail to get organization if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .get('/iam/organizations/000000000001')
          .expect(401);
      });

      it('should fail to get organization if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/iam/organizations/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get organizations if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${GetOrganization}`],
            resources: ['*'],
          },
        );
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const response = await request(app.getHttpServer())
          .get(`/iam/organizations/${savedOrganization._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
        expect(response.body.name).toBe(createOrganizationDto.name);
      });

      it('should fail to get organization if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${OrganizationScope}:${GetOrganization}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/organizations/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get organization if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${GetOrganization}`],
            resources: [savedOrganization._id.toString()],
          },
        );
        const response = await request(app.getHttpServer())
          .get(`/iam/organizations/${savedOrganization._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
        expect(response.body.name).toBe(createOrganizationDto.name);
      });

      it('should fail to get organization if user has deny effect and no wildcard resource in policy', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${OrganizationScope}:${GetOrganization}`],
            resources: [savedOrganization._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .get(`/iam/organizations/${savedOrganization._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:${GetOrganization}`],
              resources: [savedOrganization._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${OrganizationScope}:${GetOrganization}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .get(`/iam/organizations/${savedOrganization._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get organization if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:${GetOrganization}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${OrganizationScope}:${GetOrganization}`],
              resources: [savedOrganization._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .get(`/iam/organizations/${savedOrganization._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get organization if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:${GetOrganization}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${OrganizationScope}:${GetOrganization}`],
              resources: ['000000000000'],
            },
          ],
        );
        const response = await request(app.getHttpServer())
          .get(`/iam/organizations/${savedOrganization._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
      });
    });

    describe('POST /iam/organizations', () => {
      it("should fail to create organization if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .post('/iam/organizations')
          .send(updateOrganizationDto)
          .expect(401);
      });

      it('should fail to create organization if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .post('/iam/organizations')
          .send(updateOrganizationDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should create organization if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${CreateOrganization}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .post('/iam/organizations')
          .send(updateOrganizationDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(201);
        expect(response.body._id).toBeDefined();
        expect(response.body.name).toBe(updateOrganizationDto.name);
      });

      it('should fail to create organization if user has resource informed in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${CreateOrganization}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .post('/iam/organizations')
          .send(updateOrganizationDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to create organization if the fields are not correct', async () => {
        //TODO Must implement this test after create the real schema
      });
    });

    describe('PUT /iam/organizations/{id}', () => {
      it("should fail to update organization if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .put('/iam/organizations/000000000001')
          .send(updateOrganizationDto)
          .expect(401);
      });

      it('should fail to update organization if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .put('/iam/organizations/000000000001')
          .send(updateOrganizationDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update organization if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${UpdateOrganization}`],
            resources: ['*'],
          },
        );
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const response = await request(app.getHttpServer())
          .put(`/iam/organizations/${savedOrganization._id}`)
          .send(updateOrganizationDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBe(savedOrganization._id.toString());
      });

      it('should fail to update organization if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${OrganizationScope}:${UpdateOrganization}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .put('/iam/organizations/000000000001')
          .send(updateOrganizationDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update organization if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${UpdateOrganization}`],
            resources: [savedOrganization._id._id.toString()],
          },
        );
        const response = await request(app.getHttpServer())
          .put(`/iam/organizations/${savedOrganization._id._id}`)
          .send(updateOrganizationDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
      });

      it('should fail to update organization if user has deny effect and no wildcard resource in policy', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${OrganizationScope}:${UpdateOrganization}`],
            resources: [savedOrganization._id._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .put(`/iam/organizations/${savedOrganization._id._id}`)
          .send(updateOrganizationDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:${UpdateOrganization}`],
              resources: [savedOrganization._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${OrganizationScope}:${UpdateOrganization}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .put(`/iam/organizations/${savedOrganization._id._id}`)
          .send(updateOrganizationDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update organization if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:${UpdateOrganization}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${OrganizationScope}:${UpdateOrganization}`],
              resources: [savedOrganization._id._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .put(`/iam/organizations/${savedOrganization._id._id}`)
          .send(updateOrganizationDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update organization if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:${UpdateOrganization}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${OrganizationScope}:${UpdateOrganization}`],
              resources: ['000000000000'],
            },
          ],
        );
        const response = await request(app.getHttpServer())
          .put(`/iam/organizations/${savedOrganization._id._id}`)
          .send(updateOrganizationDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
      });

      it('should fail to update organization if the fields are not correct', async () => {
        //TODO Must implement this test after create the real schema
      });
    });

    describe('DELETE /iam/organizations/{id}', () => {
      it("should fail to remove organization if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .delete('/iam/organizations/000000000001')
          .expect(401);
      });

      it('should fail to remove organization if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .delete('/iam/organizations/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove organization if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${RemoveOrganization}`],
            resources: ['*'],
          },
        );
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        await request(app.getHttpServer())
          .delete(`/iam/organizations/${savedOrganization._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove organization if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${OrganizationScope}:${RemoveOrganization}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .delete('/iam/organizations/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove organization if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${RemoveOrganization}`],
            resources: [savedOrganization._id._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .delete(`/iam/organizations/${savedOrganization._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove organization if user has deny effect and no wildcard resource in policy', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${OrganizationScope}:${RemoveOrganization}`],
            resources: [savedOrganization._id._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .delete(`/iam/organizations/${savedOrganization._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:${RemoveOrganization}`],
              resources: [savedOrganization._id._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${OrganizationScope}:${RemoveOrganization}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/organizations/${savedOrganization._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove organization if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:${RemoveOrganization}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${OrganizationScope}:${RemoveOrganization}`],
              resources: [savedOrganization._id._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/organizations/${savedOrganization._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove organization if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedOrganization = await createOrganization(
          createOrganizationDto,
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${OrganizationScope}:${RemoveOrganization}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${OrganizationScope}:${RemoveOrganization}`],
              resources: ['000000000000'],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/organizations/${savedOrganization._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });
    });
  });
});

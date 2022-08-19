import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection, connect, Model } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UnitsModule } from '../units/units.module';
import { AuthModule } from '../auth/auth.module';
import { E2EUtils } from '../../framework/tests/e2e-utils';
import { Effect } from '../../framework/factories/casl-ability.factory';
import {
  CreateUnit,
  GetUnit,
  ListUnits,
  UnitScope,
  RemoveUnit,
  UpdateUnit,
  CreateChildUnit,
} from '../units/units.actions';
import { Unit, UnitSchema } from '../units/units.schema';
import { CreateUnitDto } from './dtos/create-unit.dto';
import { UpdateUnitDto } from './dtos/update-unit.dto';
import { Policy, PolicySchema } from '../policies/policies.schema';
import { User, UserSchema } from '../users/users.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organizations/organizations.schema';

describe('Units e2e', () => {
  let app: INestApplication;
  let e2eUtils: E2EUtils;
  let unitModel: Model<Unit>;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  let organization: Organization;

  const createUnit = async (unit: CreateUnitDto): Promise<Unit> => {
    return await new unitModel({ ...unit, organization }).save();
  };

  const createUnitDto: CreateUnitDto = {
    name: 'Foo',
  };
  const updateUnitDto: UpdateUnitDto = {
    name: 'Bar',
  };

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    const module = await Test.createTestingModule({
      imports: [
        AuthModule,
        UnitsModule,
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
            unitModel = mongoConnection.model(Unit.name, UnitSchema);
            const organizationModel = mongoConnection.model(
              Organization.name,
              OrganizationSchema,
            );
            organization = await new organizationModel({
              name: 'FooOrganization',
            }).save();
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

  describe('Units API', () => {
    afterEach(async () => {
      await mongoConnection.dropDatabase();
    });

    describe('GET /iam/units', () => {
      it("should fail to get units if user it's not logged in", async () => {
        await request(app.getHttpServer()).get('/iam/units').expect(401);
      });

      it('should fail to get units if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/iam/units')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get units if user has wildcard resource in policy', async () => {
        await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${ListUnits}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .get('/iam/units')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.length).toBe(2); // e2eUtils create an unit
      });

      it('should fail to get units if user has no wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${ListUnits}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/units')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get units if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UnitScope}:${ListUnits}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/units')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get units if user has deny effect and no wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UnitScope}:${ListUnits}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/units')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });
    });

    describe('GET /iam/units/{id}', () => {
      it("should fail to get unit if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .get('/iam/units/000000000001')
          .expect(401);
      });

      it('should fail to get unit if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/iam/units/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get units if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${GetUnit}`],
            resources: ['*'],
          },
        );
        const savedUnit = await createUnit(createUnitDto);
        const response = await request(app.getHttpServer())
          .get(`/iam/units/${savedUnit._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
      });

      it('should fail to get unit if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UnitScope}:${GetUnit}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/units/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get unit if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${GetUnit}`],
            resources: [savedUnit._id.toString()],
          },
        );
        const response = await request(app.getHttpServer())
          .get(`/iam/units/${savedUnit._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
      });

      it('should fail to get unit if user has deny effect and no wildcard resource in policy', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UnitScope}:${GetUnit}`],
            resources: [savedUnit._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .get(`/iam/units/${savedUnit._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get unit if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:${GetUnit}`],
              resources: [savedUnit._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UnitScope}:${GetUnit}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .get(`/iam/units/${savedUnit._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get unit if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:${GetUnit}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UnitScope}:${GetUnit}`],
              resources: [savedUnit._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .get(`/iam/units/${savedUnit._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get unit if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:${GetUnit}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UnitScope}:${GetUnit}`],
              resources: ['000000000000'],
            },
          ],
        );
        const response = await request(app.getHttpServer())
          .get(`/iam/units/${savedUnit._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
      });
    });

    describe('POST /iam/units', () => {
      it("should fail to create unit if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .post('/iam/units')
          .send(createUnitDto)
          .expect(401);
      });

      it('should fail to create unit if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .post('/iam/units')
          .send(createUnitDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should create unit if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${CreateUnit}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .post('/iam/units')
          .send(createUnitDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(201);
        expect(response.body._id).toBeDefined();
      });

      it('should fail to create unit if user has resource informed in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${CreateUnit}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .post('/iam/units')
          .send(createUnitDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to create unit if the fields are not correct', async () => {
        //TODO Must implement this test after create the real schema
      });
    });

    describe('PUT /iam/units/{id}', () => {
      it("should fail to update unit if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .put('/iam/units/000000000001')
          .send(updateUnitDto)
          .expect(401);
      });

      it('should fail to update unit if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .put('/iam/units/000000000001')
          .send(updateUnitDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update unit if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${UpdateUnit}`],
            resources: ['*'],
          },
        );
        const savedUnit = await createUnit(createUnitDto);
        const response = await request(app.getHttpServer())
          .put(`/iam/units/${savedUnit._id}`)
          .send(updateUnitDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBe(savedUnit._id.toString());
      });

      it('should fail to update unit if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UnitScope}:${UpdateUnit}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .put('/iam/units/000000000001')
          .send(updateUnitDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update unit if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${UpdateUnit}`],
            resources: [savedUnit._id._id.toString()],
          },
        );
        const response = await request(app.getHttpServer())
          .put(`/iam/units/${savedUnit._id._id}`)
          .send(updateUnitDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
      });

      it('should fail to update unit if user has deny effect and no wildcard resource in policy', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UnitScope}:${UpdateUnit}`],
            resources: [savedUnit._id._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .put(`/iam/units/${savedUnit._id._id}`)
          .send(createUnitDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:${UpdateUnit}`],
              resources: [savedUnit._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UnitScope}:${UpdateUnit}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .put(`/iam/units/${savedUnit._id._id}`)
          .send(createUnitDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update unit if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:${UpdateUnit}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UnitScope}:${UpdateUnit}`],
              resources: [savedUnit._id._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .put(`/iam/units/${savedUnit._id._id}`)
          .send(createUnitDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update unit if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:${UpdateUnit}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UnitScope}:${UpdateUnit}`],
              resources: ['000000000000'],
            },
          ],
        );
        const response = await request(app.getHttpServer())
          .put(`/iam/units/${savedUnit._id._id}`)
          .send(updateUnitDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
      });

      it('should fail to update unit if the fields are not correct', async () => {
        //TODO Must implement this test after create the real schema
      });
    });

    describe('DELETE /iam/units/{id}', () => {
      it("should fail to remove unit if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .delete('/iam/units/000000000001')
          .expect(401);
      });

      it('should fail to remove unit if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .delete('/iam/units/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove unit if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${RemoveUnit}`],
            resources: ['*'],
          },
        );
        const savedUnit = await createUnit(createUnitDto);
        await request(app.getHttpServer())
          .delete(`/iam/units/${savedUnit._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove unit if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UnitScope}:${RemoveUnit}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .delete('/iam/units/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove unit if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${RemoveUnit}`],
            resources: [savedUnit._id._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .delete(`/iam/units/${savedUnit._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove unit if user has deny effect and no wildcard resource in policy', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UnitScope}:${RemoveUnit}`],
            resources: [savedUnit._id._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .delete(`/iam/units/${savedUnit._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:${RemoveUnit}`],
              resources: [savedUnit._id._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UnitScope}:${RemoveUnit}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/units/${savedUnit._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove unit if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:${RemoveUnit}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UnitScope}:${RemoveUnit}`],
              resources: [savedUnit._id._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/units/${savedUnit._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove unit if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedUnit = await createUnit(createUnitDto);
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${UnitScope}:${RemoveUnit}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UnitScope}:${RemoveUnit}`],
              resources: ['000000000000'],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/units/${savedUnit._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });
    });

    describe('POST /iam/units/child', () => {
      it("should fail to create unit if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .post('/iam/units/child')
          .send(createUnitDto)
          .expect(401);
      });

      it('should fail to create unit if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .post('/iam/units/child')
          .send(createUnitDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should create unit if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${CreateChildUnit}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .post('/iam/units/child')
          .send(createUnitDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(201);
        expect(response.body._id).toBeDefined();
        expect(response.body.parent).toBeDefined();
      });

      it('should fail to create unit if user has resource informed in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${CreateChildUnit}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .post('/iam/units/child')
          .send(createUnitDto)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to create unit if the fields are not correct', async () => {
        //TODO Must implement this test after create the real schema
      });
    });
  });
});

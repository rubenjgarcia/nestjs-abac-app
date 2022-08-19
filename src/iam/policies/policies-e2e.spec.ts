import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection, connect } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PoliciesModule } from './policies.module';
import { AuthModule } from '../auth/auth.module';
import { E2EUtils } from '../../framework/tests/e2e-utils';
import { Effect } from '../../framework/factories/casl-ability.factory';
import {
  CreatePolicy,
  GetPolicy,
  ListPolicies,
  PolicyScope,
  RemovePolicy,
  UpdatePolicy,
} from './policies.actions';
import { Policy, PolicySchema } from './policies.schema';
import { User, UserSchema } from '../users/users.schema';
import { Unit, UnitSchema } from '../units/units.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organizations/organizations.schema';

describe('Policies e2e', () => {
  let app: INestApplication;
  let e2eUtils: E2EUtils;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    const module = await Test.createTestingModule({
      imports: [
        AuthModule,
        PoliciesModule,
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
          imports: [
            MongooseModule.forFeature([
              { name: User.name, schema: UserSchema },
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

  describe('Policies API', () => {
    afterEach(async () => {
      await mongoConnection.dropDatabase();
    });

    describe('GET /iam/policies', () => {
      it("should fail to get policies if user it's not logged in", async () => {
        await request(app.getHttpServer()).get('/iam/policies').expect(401);
      });

      it('should fail to get policies if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/iam/policies')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get policies if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${ListPolicies}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .get('/iam/policies')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.length).toBe(1);
      });

      it('should fail to get policies if user has no wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${ListPolicies}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/policies')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get policies if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${PolicyScope}:${ListPolicies}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/policies')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get policies if user has deny effect and no wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${PolicyScope}:${ListPolicies}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/policies')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });
    });

    describe('GET /iam/policies/{id}', () => {
      it("should fail to get policy if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .get('/iam/policies/000000000001')
          .expect(401);
      });

      it('should fail to get policy if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/iam/policies/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get policies if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${GetPolicy}`],
            resources: ['*'],
          },
        );
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const response = await request(app.getHttpServer())
          .get(`/iam/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.name).toBe('BarPolicy');
        expect(response.body.effect).toBe(Effect.Allow);
        expect(response.body.actions).toStrictEqual(['Bar:Action']);
        expect(response.body.resources).toStrictEqual(['*']);
      });

      it('should fail to get policy if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${PolicyScope}:${GetPolicy}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/policies/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get policy if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${GetPolicy}`],
            resources: [savedPolicy._id.toString()],
          },
        );
        const response = await request(app.getHttpServer())
          .get(`/iam/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.name).toBe('BarPolicy');
        expect(response.body.effect).toBe(Effect.Allow);
        expect(response.body.actions).toStrictEqual(['Bar:Action']);
        expect(response.body.resources).toStrictEqual(['*']);
      });

      it('should fail to get policy if user has deny effect and no wildcard resource in policy', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${PolicyScope}:${GetPolicy}`],
            resources: [savedPolicy._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .get(`/iam/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get policy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${GetPolicy}`],
              resources: [savedPolicy._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${PolicyScope}:${GetPolicy}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .get(`/iam/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get policy if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${GetPolicy}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${PolicyScope}:${GetPolicy}`],
              resources: [savedPolicy._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .get(`/iam/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get policy if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${GetPolicy}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${PolicyScope}:${GetPolicy}`],
              resources: ['000000000000'],
            },
          ],
        );
        const response = await request(app.getHttpServer())
          .get(`/iam/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.name).toBe('BarPolicy');
        expect(response.body.effect).toBe(Effect.Allow);
        expect(response.body.actions).toStrictEqual(['Bar:Action']);
        expect(response.body.resources).toStrictEqual(['*']);
      });
    });

    describe('POST /iam/policies', () => {
      it("should fail to create policy if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .expect(401);
      });

      it('should fail to create policy if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should create policy if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${CreatePolicy}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(201);
        expect(response.body.name).toBe('BarPolicy');
        expect(response.body.effect).toBe(Effect.Allow);
        expect(response.body.actions).toStrictEqual(['Bar:Action']);
        expect(response.body.resources).toStrictEqual(['*']);
      });

      it('should fail to create policy if user has resource informed in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${CreatePolicy}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to create policy if the fields are not correct', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${CreatePolicy}`],
            resources: ['*'],
          },
        );
        let response = await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'name should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            name: '',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'name should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            name: 'BarPolicy',
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          "effect should be 'Allow' or 'Deny'",
        ]);

        response = await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            name: 'BarPolicy',
            effect: '',
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          "effect should be 'Allow' or 'Deny'",
        ]);

        response = await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            name: 'BarPolicy',
            effect: 'Foo',
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          "effect should be 'Allow' or 'Deny'",
        ]);

        response = await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'each value in actions should not be empty',
          'actions should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: [],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'actions should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: [''],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'each value in actions should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'each value in resources should not be empty',
          'resources should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: [],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'resources should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .post('/iam/policies')
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: [''],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'each value in resources should not be empty',
        ]);
      });
    });

    describe('PUT /iam/policies/{id}', () => {
      it("should fail to update policy if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .put('/iam/policies/000000000001')
          .send({
            name: 'BazPolicy',
            effect: Effect.Deny,
            actions: ['Baz:Action'],
            resources: ['000000000000'],
          })
          .expect(401);
      });

      it('should fail to update policy if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .put('/iam/policies/000000000001')
          .send({
            name: 'BazPolicy',
            effect: Effect.Deny,
            actions: ['Baz:Action'],
            resources: ['000000000000'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update policy if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${UpdatePolicy}`],
            resources: ['*'],
          },
        );
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const response = await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BazPolicy',
            effect: Effect.Deny,
            actions: ['Baz:Action'],
            resources: ['000000000000'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.name).toBe('BazPolicy');
        expect(response.body.effect).toBe(Effect.Deny);
        expect(response.body.actions).toStrictEqual(['Baz:Action']);
        expect(response.body.resources).toStrictEqual(['000000000000']);
      });

      it('should fail to update policy if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${PolicyScope}:${UpdatePolicy}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .put('/iam/policies/000000000001')
          .send({
            name: 'BazPolicy',
            effect: Effect.Deny,
            actions: ['Baz:Action'],
            resources: ['000000000000'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update policy if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${UpdatePolicy}`],
            resources: [savedPolicy._id.toString()],
          },
        );
        const response = await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BazPolicy',
            effect: Effect.Deny,
            actions: ['Baz:Action'],
            resources: ['000000000000'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.name).toBe('BazPolicy');
        expect(response.body.effect).toBe(Effect.Deny);
        expect(response.body.actions).toStrictEqual(['Baz:Action']);
        expect(response.body.resources).toStrictEqual(['000000000000']);
      });

      it('should fail to update policy if user has deny effect and no wildcard resource in policy', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${PolicyScope}:${UpdatePolicy}`],
            resources: [savedPolicy._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BazPolicy',
            effect: Effect.Deny,
            actions: ['Baz:Action'],
            resources: ['000000000000'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${UpdatePolicy}`],
              resources: [savedPolicy._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${PolicyScope}:${UpdatePolicy}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BazPolicy',
            effect: Effect.Deny,
            actions: ['Baz:Action'],
            resources: ['000000000000'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update policy if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${UpdatePolicy}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${PolicyScope}:${UpdatePolicy}`],
              resources: [savedPolicy._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BazPolicy',
            effect: Effect.Deny,
            actions: ['Baz:Action'],
            resources: ['000000000000'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update policy if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${UpdatePolicy}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${PolicyScope}:${UpdatePolicy}`],
              resources: ['000000000000'],
            },
          ],
        );
        const response = await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BazPolicy',
            effect: Effect.Deny,
            actions: ['Baz:Action'],
            resources: ['000000000000'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.name).toBe('BazPolicy');
        expect(response.body.effect).toBe(Effect.Deny);
        expect(response.body.actions).toStrictEqual(['Baz:Action']);
        expect(response.body.resources).toStrictEqual(['000000000000']);
      });

      it('should fail to update policy if the fields are not correct', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${UpdatePolicy}`],
            resources: ['*'],
          },
        );
        let response = await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'name should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: '',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'name should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BarPolicy',
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          "effect should be 'Allow' or 'Deny'",
        ]);

        response = await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BarPolicy',
            effect: '',
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          "effect should be 'Allow' or 'Deny'",
        ]);

        response = await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BarPolicy',
            effect: 'Foo',
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          "effect should be 'Allow' or 'Deny'",
        ]);

        response = await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'each value in actions should not be empty',
          'actions should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: [],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'actions should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: [''],
            resources: ['*'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'each value in actions should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'each value in resources should not be empty',
          'resources should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: [],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'resources should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .put(`/iam/policies/${savedPolicy._id}`)
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: [''],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'each value in resources should not be empty',
        ]);
      });
    });

    describe('DELETE /iam/policies/{id}', () => {
      it("should fail to remove policy if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .delete('/iam/policies/000000000001')
          .expect(401);
      });

      it('should fail to remove policy if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .delete('/iam/policies/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove policy if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${RemovePolicy}`],
            resources: ['*'],
          },
        );
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        await request(app.getHttpServer())
          .delete(`/iam/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove policy if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${PolicyScope}:${RemovePolicy}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .delete('/iam/policies/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove policy if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${RemovePolicy}`],
            resources: [savedPolicy._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .delete(`/iam/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove policy if user has deny effect and no wildcard resource in policy', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${PolicyScope}:${RemovePolicy}`],
            resources: [savedPolicy._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .delete(`/iam/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${RemovePolicy}`],
              resources: [savedPolicy._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${PolicyScope}:${RemovePolicy}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove policy if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${RemovePolicy}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${PolicyScope}:${RemovePolicy}`],
              resources: [savedPolicy._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove policy if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${PolicyScope}:${RemovePolicy}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${PolicyScope}:${RemovePolicy}`],
              resources: ['000000000000'],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });
    });
  });
});

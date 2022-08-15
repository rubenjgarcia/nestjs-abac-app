import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection, connect } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UsersModule } from './users.module';
import { AuthModule } from '../auth/auth.module';
import { E2EUtils } from '../../framework/tests/e2e-utils';
import { Effect } from '../../framework/factories/casl-ability.factory';
import {
  CreateUser,
  GetUser,
  ListUsers,
  RemoveUser,
  UpdateUser,
  UserScope,
} from './users.actions';
import { User, UserSchema } from './users.schema';
import { Policy, PolicySchema } from '../policies/policies.schema';

describe('Users e2e', () => {
  let app: INestApplication;
  let e2eUtils: E2EUtils;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    const module = await Test.createTestingModule({
      imports: [
        AuthModule,
        UsersModule,
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
          imports: [
            MongooseModule.forFeature([
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
            e2eUtils = new E2EUtils(userModel, policyModel, jwtService);
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

  describe('Users API', () => {
    afterEach(async () => {
      await mongoConnection.dropDatabase();
    });

    describe('GET /iam/users', () => {
      it("should fail to get users if user it's not logged in", async () => {
        await request(app.getHttpServer()).get('/iam/users').expect(401);
      });

      it('should fail to get users if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/iam/users')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get users if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${ListUsers}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .get('/iam/users')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.length).toBe(1);
      });

      it('should fail to get users if user has no wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${ListUsers}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/users')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get users if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UserScope}:${ListUsers}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/users')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get users if user has deny effect and no wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UserScope}:${ListUsers}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/users')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });
    });

    describe('GET /iam/users/{id}', () => {
      it("should fail to get user if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .get('/iam/users/000000000001')
          .expect(401);
      });

      it('should fail to get user if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/iam/users/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get users if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${GetUser}`],
            resources: ['*'],
          },
        );
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .get(`/iam/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.email).toBe('bar@example.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.policies).toBeUndefined();
      });

      it('should fail to get user if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UserScope}:${GetUser}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/users/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get user if user has allow effect and the resource is informed with the same id of the user that is trying to get', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${GetUser}`],
            resources: [userResponse._id.toString()],
          },
        );
        const response = await request(app.getHttpServer())
          .get(`/iam/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.email).toBe('bar@example.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.policies).toBeUndefined();
      });

      it('should fail to get user if user has deny effect and no wildcard resource in policy', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UserScope}:${GetUser}`],
            resources: [userResponse._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .get(`/iam/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get user if user has allow effect and the resource is informed with the same id of the user that is trying to get and has deny effect with wildcard', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
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
              actions: [`${UserScope}:${GetUser}`],
              resources: [userResponse._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UserScope}:${GetUser}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .get(`/iam/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get user if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the user that is trying to get', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
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
              actions: [`${UserScope}:${GetUser}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UserScope}:${GetUser}`],
              resources: [userResponse._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .get(`/iam/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get user if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the user that is trying to get', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
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
              actions: [`${UserScope}:${GetUser}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UserScope}:${GetUser}`],
              resources: ['000000000000'],
            },
          ],
        );
        const response = await request(app.getHttpServer())
          .get(`/iam/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.email).toBe('bar@example.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.policies).toBeUndefined();
      });
    });

    describe('POST /iam/users', () => {
      it("should fail to create user if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .post('/iam/users')
          .send({
            email: 'bar@example.com',
            password: 'bar',
          })
          .expect(401);
      });

      it('should fail to create user if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .post('/iam/users')
          .send({
            email: 'bar@example.com',
            password: 'bar',
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to create if user has resource informed in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${CreateUser}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .post('/iam/users')
          .send({
            email: 'bar@example.com',
            password: 'bar',
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should create user without policies if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${CreateUser}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .post('/iam/users')
          .send({
            email: 'bar@example.com',
            password: 'bar',
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(201);
        expect(response.body.email).toBe('bar@example.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.policies).toBeUndefined();
      });

      it('should create user with policies if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${CreateUser}`],
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
          .post('/iam/users')
          .send({
            email: 'bar@example.com',
            password: 'bar',
            policies: [savedPolicy._id.toString()],
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(201);
        expect(response.body.email).toBe('bar@example.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.policies).toBeUndefined();
      });

      it('should fail to create user if the fields are not correct', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${CreateUser}`],
            resources: ['*'],
          },
        );
        let response = await request(app.getHttpServer())
          .post('/iam/users')
          .send({
            password: 'bar',
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual(['email must be an email']);

        response = await request(app.getHttpServer())
          .post('/iam/users')
          .send({
            email: 'e',
            password: 'bar',
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual(['email must be an email']);

        response = await request(app.getHttpServer())
          .post('/iam/users')
          .send({
            email: 'bar@example.com',
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'password should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .post('/iam/users')
          .send({
            email: 'bar@example.com',
            password: '',
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'password should not be empty',
        ]);
      });
    });

    describe('UPDATE /iam/users/{id}', () => {
      it("should fail to update user if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .put('/iam/users/000000000001')
          .send({ policies: [] })
          .expect(401);
      });

      it('should fail to update user if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .put('/iam/users/000000000001')
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update users if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${UpdateUser}`],
            resources: ['*'],
          },
        );
        const savedPolicy = await e2eUtils.createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const userResponse = await e2eUtils.createUser({
          email: 'bar@example.com',
          password: 'bar',
          policies: [savedPolicy._id.toString()],
        });
        const response = await request(app.getHttpServer())
          .put(`/iam/users/${userResponse._id}`)
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.email).toBe('bar@example.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.policies).toBeUndefined();
      });

      it('should fail to update user if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UserScope}:${UpdateUser}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .put('/iam/users/000000000001')
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update user if user has allow effect and the resource is informed with the same id of the user that is trying to get', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${UpdateUser}`],
            resources: [userResponse._id.toString()],
          },
        );
        const response = await request(app.getHttpServer())
          .put(`/iam/users/${userResponse._id}`)
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.email).toBe('bar@example.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.policies).toBeUndefined();
      });

      it('should fail to update user if user has deny effect and no wildcard resource in policy', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UserScope}:${UpdateUser}`],
            resources: [userResponse._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .put(`/iam/users/${userResponse._id}`)
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update user if user has allow effect and the resource is informed with the same id of the user that is trying to get and has deny effect with wildcard', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
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
              actions: [`${UserScope}:${UpdateUser}`],
              resources: [userResponse._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UserScope}:${UpdateUser}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .put(`/iam/users/${userResponse._id}`)
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update user if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the user that is trying to get', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
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
              actions: [`${UserScope}:${UpdateUser}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UserScope}:${UpdateUser}`],
              resources: [userResponse._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .put(`/iam/users/${userResponse._id}`)
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update user if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the user that is trying to get', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
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
              actions: [`${UserScope}:${UpdateUser}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UserScope}:${UpdateUser}`],
              resources: ['000000000000'],
            },
          ],
        );
        const response = await request(app.getHttpServer())
          .put(`/iam/users/${userResponse._id}`)
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.email).toBe('bar@example.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.policies).toBeUndefined();
      });
    });

    describe('DELETE /iam/users/{id}', () => {
      it("should fail to remove user if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .delete('/iam/users/000000000001')
          .expect(401);
      });

      it('should fail to remove user if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .delete('/iam/users/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove users if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${RemoveUser}`],
            resources: ['*'],
          },
        );
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .delete(`/iam/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove user if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UserScope}:${RemoveUser}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .delete('/iam/users/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove user if user has allow effect and the resource is informed with the same id of the user that is trying to get', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${RemoveUser}`],
            resources: [userResponse._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .delete(`/iam/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove user if user has deny effect and no wildcard resource in policy', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
        );
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${UserScope}:${RemoveUser}`],
            resources: [userResponse._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .delete(`/iam/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove user if user has allow effect and the resource is informed with the same id of the user that is trying to get and has deny effect with wildcard', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
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
              actions: [`${UserScope}:${RemoveUser}`],
              resources: [userResponse._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UserScope}:${RemoveUser}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove user if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the user that is trying to get', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
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
              actions: [`${UserScope}:${RemoveUser}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UserScope}:${RemoveUser}`],
              resources: [userResponse._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove user if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the user that is trying to get', async () => {
        const userResponse = await e2eUtils.createUser(
          {
            email: 'bar@example.com',
            password: 'bar',
          },
          {
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          },
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
              actions: [`${UserScope}:${RemoveUser}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${UserScope}:${RemoveUser}`],
              resources: ['000000000000'],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });
    });
  });
});

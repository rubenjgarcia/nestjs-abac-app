import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection, connect, Model } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth.module';
import { CreateUserDto } from './dtos/users';
import { CreatePolicyDto } from './dtos/policies';
import {
  CreateUser,
  GetUser,
  ListUsers,
  RemoveUser,
  UpdateUser,
  UserScope,
} from './actions/user.actions';
import {
  CreatePolicy,
  GetPolicy,
  ListPolicies,
  PolicyScope,
  RemovePolicy,
  UpdatePolicy,
} from './actions/policy.actions';
import { Effect } from './factories/casl-ability.factory';
import { User, UserSchema } from './schemas/user.schema';
import { Policy, PolicySchema } from './schemas/policy.schema';

describe('Auth Module API', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let policyModel: Model<Policy>;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  const createPolicy = async (policy: CreatePolicyDto): Promise<Policy> => {
    return await new policyModel(policy).save();
  };

  const createUser = async (
    user: CreateUserDto,
    policies?: CreatePolicyDto | CreatePolicyDto[],
  ): Promise<User> => {
    const hash = await bcrypt.hash(user.password, 10);
    if (policies !== undefined) {
      const savedPolicies = await Promise.all(
        [].concat(policies).map(async (p) => {
          const savedPolicy = await createPolicy(p);
          return savedPolicy._id.toString();
        }),
      );
      return await new userModel({
        ...user,
        password: hash,
        policies: savedPolicies,
      }).save();
    } else {
      return await new userModel({ ...user, password: hash }).save();
    }
  };

  const createUserAndLogin = async (
    user: CreateUserDto,
    policies?: CreatePolicyDto | CreatePolicyDto[],
  ) => {
    await createUser(user, policies);
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: user.password });
    return response.body.access_token;
  };

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    const module = await Test.createTestingModule({
      imports: [
        AuthModule,
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
          useFactory: async () => {
            mongod = await MongoMemoryServer.create();
            const uri = await mongod.getUri();
            mongoConnection = (await connect(uri)).connection;
            userModel = mongoConnection.model(User.name, UserSchema);
            policyModel = mongoConnection.model(Policy.name, PolicySchema);
            return { uri };
          },
        }),
      ],
      providers: [
        { provide: getModelToken(User.name), useValue: userModel },
        {
          provide: getModelToken(Policy.name),
          useValue: policyModel,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await Promise.all([mongoConnection.close(), mongod.stop(), app.close()]);
  });

  afterEach(async () => {
    await mongoConnection.dropDatabase();
  });

  describe('Auth', () => {
    describe('POST /auth/login', () => {
      it('should deny login if no users in database', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'foo@example.com', password: 'bar' })
          .expect(401);
      });

      it('should deny login if user is not in database', async () => {
        const user = { email: 'bar@example.com', password: 'bar' };
        await createUser(user);
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'foo@example.com', password: 'bar' })
          .expect(401);
      });

      it('should deny login if password is wrong', async () => {
        const user = { email: 'foo@example.com', password: 'bar' };
        await createUser(user);
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'foo@example.com', password: 'baz' })
          .expect(401);
      });

      it('should allow login if is in the database', async () => {
        const user = { email: 'foo@example.com', password: 'bar' };
        await createUser(user);
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send(user)
          .expect(200);

        expect(response.body.access_token).toBeDefined();
      });
    });
  });

  describe('Users', () => {
    describe('GET /auth/users', () => {
      it("should fail to get users if user it's not logged in", async () => {
        await request(app.getHttpServer()).get('/auth/users').expect(401);
      });

      it('should fail to get users if user has no policies', async () => {
        const accessToken = await createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/auth/users')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get users if user has wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .get('/auth/users')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.length).toBe(1);
      });

      it('should fail to get users if user has no wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .get('/auth/users')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get users if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .get('/auth/users')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get users if user has deny effect and no wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .get('/auth/users')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });
    });

    describe('GET /auth/users/{id}', () => {
      it("should fail to get user if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .get('/auth/users/000000000001')
          .expect(401);
      });

      it('should fail to get user if user has no policies', async () => {
        const accessToken = await createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/auth/users/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get users if user has wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
        const userResponse = await createUser(
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
          .get(`/auth/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.email).toBe('bar@example.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.policies).toBeUndefined();
      });

      it('should fail to get user if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .get('/auth/users/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get user if user has allow effect and the resource is informed with the same id of the user that is trying to get', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .get(`/auth/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.email).toBe('bar@example.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.policies).toBeUndefined();
      });

      it('should fail to get user if user has deny effect and no wildcard resource in policy', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .get(`/auth/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get user if user has allow effect and the resource is informed with the same id of the user that is trying to get and has deny effect with wildcard', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .get(`/auth/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get user if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the user that is trying to get', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .get(`/auth/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get user if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the user that is trying to get', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .get(`/auth/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.email).toBe('bar@example.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.policies).toBeUndefined();
      });
    });

    describe('POST /auth/users', () => {
      it("should fail to create user if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .post('/auth/users')
          .send({
            email: 'bar@example.com',
            password: 'bar',
          })
          .expect(401);
      });

      it('should fail to create user if user has no policies', async () => {
        const accessToken = await createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .post('/auth/users')
          .send({
            email: 'bar@example.com',
            password: 'bar',
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to create if user has resource informed in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .post('/auth/users')
          .send({
            email: 'bar@example.com',
            password: 'bar',
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should create user without policies if user has wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .post('/auth/users')
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
        const accessToken = await createUserAndLogin(
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
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const response = await request(app.getHttpServer())
          .post('/auth/users')
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
        const accessToken = await createUserAndLogin(
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
          .post('/auth/users')
          .send({
            password: 'bar',
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual(['email must be an email']);

        response = await request(app.getHttpServer())
          .post('/auth/users')
          .send({
            email: 'e',
            password: 'bar',
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual(['email must be an email']);

        response = await request(app.getHttpServer())
          .post('/auth/users')
          .send({
            email: 'bar@example.com',
          })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'password should not be empty',
        ]);

        response = await request(app.getHttpServer())
          .post('/auth/users')
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

    describe('UPDATE /auth/users/{id}', () => {
      it("should fail to update user if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .put('/auth/users/000000000001')
          .send({ policies: [] })
          .expect(401);
      });

      it('should fail to update user if user has no policies', async () => {
        const accessToken = await createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .put('/auth/users/000000000001')
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update users if user has wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const userResponse = await createUser({
          email: 'bar@example.com',
          password: 'bar',
          policies: [savedPolicy._id.toString()],
        });
        const response = await request(app.getHttpServer())
          .put(`/auth/users/${userResponse._id}`)
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.email).toBe('bar@example.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.policies).toBeUndefined();
      });

      it('should fail to update user if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .put('/auth/users/000000000001')
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update user if user has allow effect and the resource is informed with the same id of the user that is trying to get', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .put(`/auth/users/${userResponse._id}`)
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.email).toBe('bar@example.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.policies).toBeUndefined();
      });

      it('should fail to update user if user has deny effect and no wildcard resource in policy', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .put(`/auth/users/${userResponse._id}`)
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update user if user has allow effect and the resource is informed with the same id of the user that is trying to get and has deny effect with wildcard', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .put(`/auth/users/${userResponse._id}`)
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update user if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the user that is trying to get', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .put(`/auth/users/${userResponse._id}`)
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update user if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the user that is trying to get', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .put(`/auth/users/${userResponse._id}`)
          .send({ policies: [] })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.email).toBe('bar@example.com');
        expect(response.body.password).toBeUndefined();
        expect(response.body.policies).toBeUndefined();
      });
    });

    describe('DELETE /auth/users/{id}', () => {
      it("should fail to remove user if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .delete('/auth/users/000000000001')
          .expect(401);
      });

      it('should fail to remove user if user has no policies', async () => {
        const accessToken = await createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .delete('/auth/users/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove users if user has wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
        const userResponse = await createUser(
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
          .delete(`/auth/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove user if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .delete('/auth/users/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove user if user has allow effect and the resource is informed with the same id of the user that is trying to get', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .delete(`/auth/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove user if user has deny effect and no wildcard resource in policy', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .delete(`/auth/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove user if user has allow effect and the resource is informed with the same id of the user that is trying to get and has deny effect with wildcard', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .delete(`/auth/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove user if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the user that is trying to get', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .delete(`/auth/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove user if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the user that is trying to get', async () => {
        const userResponse = await createUser(
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
        const accessToken = await createUserAndLogin(
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
          .delete(`/auth/users/${userResponse._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });
    });
  });

  describe('Policies', () => {
    describe('GET /auth/policies', () => {
      it("should fail to get policies if user it's not logged in", async () => {
        await request(app.getHttpServer()).get('/auth/policies').expect(401);
      });

      it('should fail to get policies if user has no policies', async () => {
        const accessToken = await createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/auth/policies')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get policies if user has wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .get('/auth/policies')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.length).toBe(1);
      });

      it('should fail to get policies if user has no wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .get('/auth/policies')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get policies if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .get('/auth/policies')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get policies if user has deny effect and no wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .get('/auth/policies')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });
    });

    describe('GET /auth/policies/{id}', () => {
      it("should fail to get policy if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .get('/auth/policies/000000000001')
          .expect(401);
      });

      it('should fail to get policy if user has no policies', async () => {
        const accessToken = await createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/auth/policies/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get policies if user has wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const response = await request(app.getHttpServer())
          .get(`/auth/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.name).toBe('BarPolicy');
        expect(response.body.effect).toBe(Effect.Allow);
        expect(response.body.actions).toStrictEqual(['Bar:Action']);
        expect(response.body.resources).toStrictEqual(['*']);
      });

      it('should fail to get policy if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .get('/auth/policies/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get policy if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .get(`/auth/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.name).toBe('BarPolicy');
        expect(response.body.effect).toBe(Effect.Allow);
        expect(response.body.actions).toStrictEqual(['Bar:Action']);
        expect(response.body.resources).toStrictEqual(['*']);
      });

      it('should fail to get policy if user has deny effect and no wildcard resource in policy', async () => {
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .get(`/auth/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .get(`/auth/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get policy if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .get(`/auth/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get policy if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .get(`/auth/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.name).toBe('BarPolicy');
        expect(response.body.effect).toBe(Effect.Allow);
        expect(response.body.actions).toStrictEqual(['Bar:Action']);
        expect(response.body.resources).toStrictEqual(['*']);
      });
    });

    describe('POST /auth/policies', () => {
      it("should fail to create policy if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .post('/auth/policies')
          .send({
            name: 'BarPolicy',
            effect: Effect.Allow,
            actions: ['Bar:Action'],
            resources: ['*'],
          })
          .expect(401);
      });

      it('should fail to create policy if user has no policies', async () => {
        const accessToken = await createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .post('/auth/policies')
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
        const accessToken = await createUserAndLogin(
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
          .post('/auth/policies')
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
        const accessToken = await createUserAndLogin(
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
          .post('/auth/policies')
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
        const accessToken = await createUserAndLogin(
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
          .post('/auth/policies')
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
          .post('/auth/policies')
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
          .post('/auth/policies')
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
          .post('/auth/policies')
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
          .post('/auth/policies')
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
          .post('/auth/policies')
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
          .post('/auth/policies')
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
          .post('/auth/policies')
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
          .post('/auth/policies')
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
          .post('/auth/policies')
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
          .post('/auth/policies')
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

    describe('PUT /auth/policies/{id}', () => {
      it("should fail to update policy if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .put('/auth/policies/000000000001')
          .send({
            name: 'BazPolicy',
            effect: Effect.Deny,
            actions: ['Baz:Action'],
            resources: ['000000000000'],
          })
          .expect(401);
      });

      it('should fail to update policy if user has no policies', async () => {
        const accessToken = await createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .put('/auth/policies/000000000001')
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
        const accessToken = await createUserAndLogin(
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
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const response = await request(app.getHttpServer())
          .put(`/auth/policies/${savedPolicy._id}`)
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
        const accessToken = await createUserAndLogin(
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
          .put('/auth/policies/000000000001')
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
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
          .put(`/auth/policies/${savedPolicy._id}`)
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
          .put(`/auth/policies/${savedPolicy._id}`)
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

    describe('DELETE /auth/policies/{id}', () => {
      it("should fail to remove policy if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .delete('/auth/policies/000000000001')
          .expect(401);
      });

      it('should fail to remove policy if user has no policies', async () => {
        const accessToken = await createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .delete('/auth/policies/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove policy if user has wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        await request(app.getHttpServer())
          .delete(`/auth/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove policy if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await createUserAndLogin(
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
          .delete('/auth/policies/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove policy if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .delete(`/auth/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove policy if user has deny effect and no wildcard resource in policy', async () => {
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .delete(`/auth/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .delete(`/auth/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove policy if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .delete(`/auth/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove policy if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedPolicy = await createPolicy({
          name: 'BarPolicy',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        });
        const accessToken = await createUserAndLogin(
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
          .delete(`/auth/policies/${savedPolicy._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });
    });
  });
});

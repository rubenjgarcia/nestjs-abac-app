import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection, connect, Model } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { <%= classify(name) %>Module } from './<%= name %>.module';
import { AuthModule } from '../iam/auth/auth.module';
import { E2EUtils } from '../framework/tests/e2e-utils';
import { Effect } from '../framework/factories/casl-ability.factory';
import {
  Create<%= singular(classify(name)) %>,
  Get<%= singular(classify(name)) %>,
  List<%= classify(name) %>,
  <%= singular(classify(name)) %>Scope,
  Remove<%= singular(classify(name)) %>,
  Update<%= singular(classify(name)) %>,
} from './<%= name %>.actions';
import { <%= singular(classify(name)) %>, <%= singular(classify(name)) %>Schema } from './<%= name %>.schema';
import { Create<%= singular(classify(name)) %>Dto } from './dtos/create-<%= singular(name) %>.dto';
import { Policy, PolicySchema } from '../iam/policies/policies.schema';
import { User, UserSchema } from '../iam/users/users.schema';

describe('<%= classify(name) %> e2e', () => {
  let app: INestApplication;
  let e2eUtils: E2EUtils;
  let <%= singular(name) %>Model: Model<<%= singular(classify(name)) %>>;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  const create<%= singular(classify(name)) %> = async (<%= singular(name) %>: Create<%= singular(classify(name)) %>Dto): Promise<<%= singular(classify(name)) %>> => {
    return await new <%= singular(name) %>Model(<%= singular(name) %>).save();
  }

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    const module = await Test.createTestingModule({
      imports: [
        AuthModule,
        <%= classify(name) %>Module,
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
            e2eUtils = new E2EUtils(userModel, policyModel, jwtService);
            <%= singular(name) %>Model = mongoConnection.model(<%= singular(classify(name)) %>.name, <%= singular(classify(name)) %>Schema);
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

  describe('<%= classify(name) %> API', () => {
    afterEach(async () => {
      await mongoConnection.dropDatabase();
    });

    describe('GET /<%= name %>', () => {
      it("should fail to get <%= (name) %> if user it's not logged in", async () => {
        await request(app.getHttpServer()).get('/<%= name %>').expect(401);
      });

      it('should fail to get <%= (name) %> if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/<%= name %>')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get <%= (name) %> if user has wildcard resource in policy', async () => {
        await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${List<%= classify(name) %>}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .get('/<%= name %>')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.length).toBe(1);
      });

      it('should fail to get <%= (name) %> if user has no wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${List<%= classify(name) %>}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .get('/<%= name %>')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get <%= (name) %> if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${<%= singular(classify(name)) %>Scope}:${List<%= classify(name) %>}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .get('/<%= name %>')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get <%= (name) %> if user has deny effect and no wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${<%= singular(classify(name)) %>Scope}:${List<%= classify(name) %>}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .get('/<%= name %>')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });
    });

    describe('GET /<%= name %>/{id}', () => {
      it("should fail to get <%= singular(name) %> if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .get('/<%= name %>/000000000001')
          .expect(401);
      });

      it('should fail to get <%= singular(name) %> if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/<%= name %>/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get <%= (name) %> if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Get<%= singular(classify(name)) %>}`],
            resources: ['*'],
          },
        );
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const response = await request(app.getHttpServer())
          .get(`/<%= name %>/${saved<%= singular(classify(name)) %>._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
      });

      it('should fail to get <%= singular(name) %> if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Get<%= singular(classify(name)) %>}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .get('/<%= name %>/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get <%= singular(name) %> if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Get<%= singular(classify(name)) %>}`],
            resources: [saved<%= singular(classify(name)) %>._id.toString()],
          },
        );
        const response = await request(app.getHttpServer())
          .get(`/<%= name %>/${saved<%= singular(classify(name)) %>._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
          expect(response.body._id).toBeDefined();
      });

      it('should fail to get <%= singular(name) %> if user has deny effect and no wildcard resource in policy', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Get<%= singular(classify(name)) %>}`],
            resources: [saved<%= singular(classify(name)) %>._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .get(`/<%= name %>/${saved<%= singular(classify(name)) %>._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get <%= singular(name) %> if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Get<%= singular(classify(name)) %>}`],
              resources: [saved<%= singular(classify(name)) %>._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Get<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .get(`/<%= name %>/${saved<%= singular(classify(name)) %>._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get <%= singular(name) %> if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Get<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Get<%= singular(classify(name)) %>}`],
              resources: [saved<%= singular(classify(name)) %>._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .get(`/<%= name %>/${saved<%= singular(classify(name)) %>._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get <%= singular(name) %> if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Get<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Get<%= singular(classify(name)) %>}`],
              resources: ['000000000000'],
            },
          ],
        );
        const response = await request(app.getHttpServer())
          .get(`/<%= name %>/${saved<%= singular(classify(name)) %>._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
          expect(response.body._id).toBeDefined();
      });
    });

    describe('POST /<%= name %>', () => {
      it("should fail to create <%= singular(name) %> if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .post('/<%= name %>')
          .send({ })
          .expect(401);
      });

      it('should fail to create <%= singular(name) %> if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .post('/<%= name %>')
          .send({ })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should create <%= singular(name) %> if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Create<%= singular(classify(name)) %>}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .post('/<%= name %>')
          .send({ })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(201);
          expect(response.body._id).toBeDefined();
      });

      it('should fail to create <%= singular(name) %> if user has resource informed in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Create<%= singular(classify(name)) %>}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .post('/<%= name %>')
          .send({ })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to create <%= singular(name) %> if the fields are not correct', async () => {
        //TODO Must implement this test after create the real schema
      });
    });

    describe('PUT /<%= name %>/{id}', () => {
      it("should fail to update <%= singular(name) %> if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .put('/<%= name %>/000000000001')
          .send({ })
          .expect(401);
      });

      it('should fail to update <%= singular(name) %> if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .put('/<%= name %>/000000000001')
          .send({ })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update <%= singular(name) %> if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Update<%= singular(classify(name)) %>}`],
            resources: ['*'],
          },
        );
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const response = await request(app.getHttpServer())
          .put(`/<%= name %>/${saved<%= singular(classify(name)) %>._id}`)
          .send({ })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
          expect(response.body._id).toBe(saved<%= singular(classify(name)) %>._id.toString());
      });

      it('should fail to update <%= singular(name) %> if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Update<%= singular(classify(name)) %>}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .put('/<%= name %>/000000000001')
          .send({ })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update <%= singular(name) %> if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Update<%= singular(classify(name)) %>}`],
            resources: [saved<%= singular(classify(name)) %>._id._id.toString()],
          },
        );
        const response = await request(app.getHttpServer())
          .put(`/<%= name %>/${saved<%= singular(classify(name)) %>._id._id}`)
          .send({ })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
          expect(response.body._id).toBeDefined();
      });

      it('should fail to update <%= singular(name) %> if user has deny effect and no wildcard resource in policy', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Update<%= singular(classify(name)) %>}`],
            resources: [saved<%= singular(classify(name)) %>._id._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .put(`/<%= name %>/${saved<%= singular(classify(name)) %>._id._id}`)
          .send({ })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Update<%= singular(classify(name)) %>}`],
              resources: [saved<%= singular(classify(name)) %>._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Update<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .put(`/<%= name %>/${saved<%= singular(classify(name)) %>._id._id}`)
          .send({ })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update <%= singular(name) %> if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Update<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Update<%= singular(classify(name)) %>}`],
              resources: [saved<%= singular(classify(name)) %>._id._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .put(`/<%= name %>/${saved<%= singular(classify(name)) %>._id._id}`)
          .send({ })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update <%= singular(name) %> if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Update<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Update<%= singular(classify(name)) %>}`],
              resources: ['000000000000'],
            },
          ],
        );
        const response = await request(app.getHttpServer())
          .put(`/<%= name %>/${saved<%= singular(classify(name)) %>._id._id}`)
          .send({ })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
          expect(response.body._id).toBeDefined();
      });

      it('should fail to update <%= singular(name) %> if the fields are not correct', async () => {
        //TODO Must implement this test after create the real schema
      });
    });

    describe('DELETE /<%= name %>/{id}', () => {
      it("should fail to remove <%= singular(name) %> if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .delete('/<%= name %>/000000000001')
          .expect(401);
      });

      it('should fail to remove <%= singular(name) %> if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .delete('/<%= name %>/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove <%= singular(name) %> if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Remove<%= singular(classify(name)) %>}`],
            resources: ['*'],
          },
        );
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        await request(app.getHttpServer())
          .delete(`/<%= name %>/${saved<%= singular(classify(name)) %>._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove <%= singular(name) %> if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Remove<%= singular(classify(name)) %>}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .delete('/<%= name %>/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove <%= singular(name) %> if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Remove<%= singular(classify(name)) %>}`],
            resources: [saved<%= singular(classify(name)) %>._id._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .delete(`/<%= name %>/${saved<%= singular(classify(name)) %>._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove <%= singular(name) %> if user has deny effect and no wildcard resource in policy', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Remove<%= singular(classify(name)) %>}`],
            resources: [saved<%= singular(classify(name)) %>._id._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .delete(`/<%= name %>/${saved<%= singular(classify(name)) %>._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Remove<%= singular(classify(name)) %>}`],
              resources: [saved<%= singular(classify(name)) %>._id._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Remove<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/<%= name %>/${saved<%= singular(classify(name)) %>._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove <%= singular(name) %> if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Remove<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Remove<%= singular(classify(name)) %>}`],
              resources: [saved<%= singular(classify(name)) %>._id._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/<%= name %>/${saved<%= singular(classify(name)) %>._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove <%= singular(name) %> if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const saved<%= singular(classify(name)) %> = await create<%= singular(classify(name)) %>({ });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Remove<%= singular(classify(name)) %>}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${<%= singular(classify(name)) %>Scope}:${Remove<%= singular(classify(name)) %>}`],
              resources: ['000000000000'],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/<%= name %>/${saved<%= singular(classify(name)) %>._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });
    });
  });
});

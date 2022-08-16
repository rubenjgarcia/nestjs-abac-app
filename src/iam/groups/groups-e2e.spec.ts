import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection, connect, Model } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { GroupsModule } from './groups.module';
import { AuthModule } from '../auth/auth.module';
import { E2EUtils } from '../../framework/tests/e2e-utils';
import { Effect } from '../../framework/factories/casl-ability.factory';
import {
  CreateGroup,
  GetGroup,
  ListGroups,
  GroupScope,
  RemoveGroup,
  UpdateGroup,
} from './groups.actions';
import { Group, GroupSchema } from './groups.schema';
import { CreateGroupDto } from './dtos/create-group.dto';
import { Policy, PolicySchema } from '../policies/policies.schema';
import { User, UserSchema } from '../users/users.schema';

describe('Groups e2e', () => {
  let app: INestApplication;
  let e2eUtils: E2EUtils;
  let groupModel: Model<Group>;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  const createGroup = async (group: CreateGroupDto): Promise<Group> => {
    return await new groupModel(group).save();
  };

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    const module = await Test.createTestingModule({
      imports: [
        AuthModule,
        GroupsModule,
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
          imports: [
            MongooseModule.forFeature([
              { name: User.name, schema: UserSchema },
              { name: Policy.name, schema: PolicySchema },
              { name: Group.name, schema: GroupSchema },
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
            groupModel = mongoConnection.model(Group.name, GroupSchema);
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

  describe('Groups API', () => {
    afterEach(async () => {
      await mongoConnection.dropDatabase();
    });

    describe('GET /iam/groups', () => {
      it("should fail to get groups if user it's not logged in", async () => {
        await request(app.getHttpServer()).get('/iam/groups').expect(401);
      });

      it('should fail to get groups if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/iam/groups')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get groups if user has wildcard resource in policy', async () => {
        await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${ListGroups}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .get('/iam/groups')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0]._id).toBeDefined();
        expect(response.body[0].name).toBe('FooGroup');
      });

      it('should fail to get groups if user has no wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${ListGroups}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/groups')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get groups if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${GroupScope}:${ListGroups}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/groups')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get groups if user has deny effect and no wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${GroupScope}:${ListGroups}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/groups')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });
    });

    describe('GET /iam/groups/{id}', () => {
      it("should fail to get group if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .get('/iam/groups/000000000001')
          .expect(401);
      });

      it('should fail to get group if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .get('/iam/groups/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get groups if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${GetGroup}`],
            resources: ['*'],
          },
        );
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const response = await request(app.getHttpServer())
          .get(`/iam/groups/${savedGroup._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
        expect(response.body.name).toBe('FooGroup');
      });

      it('should fail to get group if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${GroupScope}:${GetGroup}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .get('/iam/groups/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get group if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${GetGroup}`],
            resources: [savedGroup._id.toString()],
          },
        );
        const response = await request(app.getHttpServer())
          .get(`/iam/groups/${savedGroup._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
        expect(response.body.name).toBe('FooGroup');
      });

      it('should fail to get group if user has deny effect and no wildcard resource in policy', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${GroupScope}:${GetGroup}`],
            resources: [savedGroup._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .get(`/iam/groups/${savedGroup._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get group if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${GetGroup}`],
              resources: [savedGroup._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${GroupScope}:${GetGroup}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .get(`/iam/groups/${savedGroup._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to get group if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${GetGroup}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${GroupScope}:${GetGroup}`],
              resources: [savedGroup._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .get(`/iam/groups/${savedGroup._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should get group if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${GetGroup}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${GroupScope}:${GetGroup}`],
              resources: ['000000000000'],
            },
          ],
        );
        const response = await request(app.getHttpServer())
          .get(`/iam/groups/${savedGroup._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
        expect(response.body.name).toBe('FooGroup');
      });
    });

    describe('POST /iam/groups', () => {
      it("should fail to create group if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .post('/iam/groups')
          .send({ name: 'FooGroup' })
          .expect(401);
      });

      it('should fail to create group if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .post('/iam/groups')
          .send({ name: 'FooGroup' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should create group if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${CreateGroup}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .post('/iam/groups')
          .send({ name: 'FooGroup' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(201);
        expect(response.body._id).toBeDefined();
        expect(response.body.name).toBe('FooGroup');
      });

      it('should fail to create group if user has resource informed in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${CreateGroup}`],
            resources: ['000000000000'],
          },
        );
        await request(app.getHttpServer())
          .post('/iam/groups')
          .send({ name: 'FooGroup' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to create group if the fields are not correct', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${CreateGroup}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .post('/iam/groups')
          .send({})
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'name should not be empty',
        ]);
      });
    });

    describe('PUT /iam/groups/{id}', () => {
      it("should fail to update group if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .put('/iam/groups/000000000001')
          .send({ name: 'BarGroup' })
          .expect(401);
      });

      it('should fail to update group if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .put('/iam/groups/000000000001')
          .send({ name: 'BarGroup' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update group if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${UpdateGroup}`],
            resources: ['*'],
          },
        );
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const response = await request(app.getHttpServer())
          .put(`/iam/groups/${savedGroup._id}`)
          .send({ name: 'BarGroup' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBe(savedGroup._id.toString());
        expect(response.body.name).toBe('BarGroup');
      });

      it('should fail to update group if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${GroupScope}:${UpdateGroup}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .put('/iam/groups/000000000001')
          .send({ name: 'BarGroup' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update group if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${UpdateGroup}`],
            resources: [savedGroup._id._id.toString()],
          },
        );
        const response = await request(app.getHttpServer())
          .put(`/iam/groups/${savedGroup._id._id}`)
          .send({ name: 'BarGroup' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
        expect(response.body.name).toBe('BarGroup');
      });

      it('should fail to update group if user has deny effect and no wildcard resource in policy', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${GroupScope}:${UpdateGroup}`],
            resources: [savedGroup._id._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .put(`/iam/groups/${savedGroup._id._id}`)
          .send({ name: 'BarGroup' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${UpdateGroup}`],
              resources: [savedGroup._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${GroupScope}:${UpdateGroup}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .put(`/iam/groups/${savedGroup._id._id}`)
          .send({ name: 'BarGroup' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to update group if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${UpdateGroup}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${GroupScope}:${UpdateGroup}`],
              resources: [savedGroup._id._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .put(`/iam/groups/${savedGroup._id._id}`)
          .send({ name: 'BarGroup' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should update group if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${UpdateGroup}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${GroupScope}:${UpdateGroup}`],
              resources: ['000000000000'],
            },
          ],
        );
        const response = await request(app.getHttpServer())
          .put(`/iam/groups/${savedGroup._id._id}`)
          .send({ name: 'BarGroup' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
        expect(response.body._id).toBeDefined();
        expect(response.body.name).toBe('BarGroup');
      });

      it('should fail to update group if the fields are not correct', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${UpdateGroup}`],
            resources: ['*'],
          },
        );
        const response = await request(app.getHttpServer())
          .put(`/iam/groups/${savedGroup._id}`)
          .send({})
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
        expect(response.body.message).toStrictEqual([
          'name should not be empty',
        ]);
      });
    });

    describe('DELETE /iam/groups/{id}', () => {
      it("should fail to remove group if user it's not logged in", async () => {
        await request(app.getHttpServer())
          .delete('/iam/groups/000000000001')
          .expect(401);
      });

      it('should fail to remove group if user has no policies', async () => {
        const accessToken = await e2eUtils.createUserAndLogin({
          email: 'foo@example.com',
          password: 'bar',
        });
        await request(app.getHttpServer())
          .delete('/iam/groups/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove group if user has wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${RemoveGroup}`],
            resources: ['*'],
          },
        );
        const savedGroup = await createGroup({ name: 'FooGroup' });
        await request(app.getHttpServer())
          .delete(`/iam/groups/${savedGroup._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove group if user has deny effect and wildcard resource in policy', async () => {
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${GroupScope}:${RemoveGroup}`],
            resources: ['*'],
          },
        );
        await request(app.getHttpServer())
          .delete('/iam/groups/000000000001')
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove group if user has allow effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${RemoveGroup}`],
            resources: [savedGroup._id._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .delete(`/iam/groups/${savedGroup._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail to remove group if user has deny effect and no wildcard resource in policy', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          {
            name: 'FooPolicy',
            effect: Effect.Deny,
            actions: [`${GroupScope}:${RemoveGroup}`],
            resources: [savedGroup._id._id.toString()],
          },
        );
        await request(app.getHttpServer())
          .delete(`/iam/groups/${savedGroup._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove polcy if user has allow effect and the resource is informed with the same id of the polcy that is trying to get and has deny effect with wildcard', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${RemoveGroup}`],
              resources: [savedGroup._id._id.toString()],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${GroupScope}:${RemoveGroup}`],
              resources: ['*'],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/groups/${savedGroup._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should fail to remove group if user has allow effect with wildcard and has deny effect and the resource is informed with the same id of the policy that is trying to get', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${RemoveGroup}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${GroupScope}:${RemoveGroup}`],
              resources: [savedGroup._id._id.toString()],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/groups/${savedGroup._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });

      it('should remove group if user has allow effect with wildcard and has deny effect and the resource is informed with different id of the policy that is trying to get', async () => {
        const savedGroup = await createGroup({ name: 'FooGroup' });
        const accessToken = await e2eUtils.createUserAndLogin(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [
            {
              name: 'FooPolicy',
              effect: Effect.Allow,
              actions: [`${GroupScope}:${RemoveGroup}`],
              resources: ['*'],
            },
            {
              name: 'BarPolicy',
              effect: Effect.Deny,
              actions: [`${GroupScope}:${RemoveGroup}`],
              resources: ['000000000000'],
            },
          ],
        );
        await request(app.getHttpServer())
          .delete(`/iam/groups/${savedGroup._id._id}`)
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });
    });
  });
});

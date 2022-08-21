import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection, connect, Model } from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthModule } from './auth.module';
import { E2EUtils } from '../../framework/tests/e2e-utils';
import { User, UserSchema } from '../users/users.schema';
import { Policy, PolicySchema } from '../policies/policies.schema';
import { Unit, UnitSchema } from '../units/units.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organizations/organizations.schema';
import { Role, RoleSchema } from '../roles/roles.schema';

describe('Auth e2e', () => {
  let app: INestApplication;
  let e2eUtils: E2EUtils;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let userModel: Model<User>;
  let roleModel: Model<Role>;

  beforeAll(async () => {
    mongoose.plugin(accessibleRecordsPlugin);
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AuthModule,
        MongooseModule.forRootAsync({
          imports: [
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
            userModel = mongoConnection.model(User.name, UserSchema);
            const policyModel = mongoConnection.model(
              Policy.name,
              PolicySchema,
            );
            const unitModel = mongoConnection.model(Unit.name, UnitSchema);
            const organizationModel = mongoConnection.model(
              Organization.name,
              OrganizationSchema,
            );
            roleModel = mongoConnection.model(Role.name, RoleSchema);
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
      providers: [JwtService],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await Promise.all([mongoConnection.close(), mongod.stop(), app.close()]);
  });

  describe('Auth API', () => {
    afterEach(async () => {
      await mongoConnection.dropDatabase();
    });

    describe('POST /auth/login', () => {
      it('should deny login if no users in database', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'foo@example.com', password: 'bar' })
          .expect(401);
      });

      it('should deny login if user is not in database', async () => {
        const user = { email: 'bar@example.com', password: 'bar' };
        await e2eUtils.createUser(user);
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'foo@example.com', password: 'bar' })
          .expect(401);
      });

      it('should deny login if password is wrong', async () => {
        const user = { email: 'foo@example.com', password: 'bar' };
        await e2eUtils.createUser(user);
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'foo@example.com', password: 'baz' })
          .expect(401);
      });

      it('should allow login if is in the database and password is correct', async () => {
        const user = { email: 'foo@example.com', password: 'bar' };
        await e2eUtils.createUser(user);
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send(user)
          .expect(200);

        expect(response.body.access_token).toBeDefined();
      });
    });

    describe('POST /auth/assume/:roleId', () => {
      it('should allow to assume a role if the user has that role', async () => {
        const unit = await e2eUtils.getUnit();
        const role = await new roleModel({ name: 'FooRole', unit }).save();
        const user = {
          email: 'foo@example.com',
          password: await e2eUtils.createPasswordHash('bar'),
          roles: [role],
          unit,
        };
        const responseUser = await new userModel(user).save();
        const accessToken = await e2eUtils.login(responseUser);
        const response = await request(app.getHttpServer())
          .post(`/auth/assume/${role._id.toString()}`)
          .send()
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);

        expect(response.body.access_token).toBeDefined();
      });

      it('should not allow to assume a role if the user not have that role', async () => {
        const unit = await e2eUtils.getUnit();
        const role = await new roleModel({ name: 'FooRole', unit }).save();
        const user = {
          email: 'foo@example.com',
          password: await e2eUtils.createPasswordHash('bar'),
          unit,
        };
        const responseUser = await new userModel(user).save();
        const accessToken = await e2eUtils.login(responseUser);
        await request(app.getHttpServer())
          .post(`/auth/assume/${role._id.toString()}`)
          .send()
          .set('Authorization', 'bearer ' + accessToken)
          .expect(403);
      });
    });
  });
});

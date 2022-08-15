import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection, connect } from 'mongoose';
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

describe('Auth e2e', () => {
  let app: INestApplication;
  let e2eUtils: E2EUtils;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

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
      it('should deny login if no users in database', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'foo@example.com', password: 'bar' })
          .expect(401);
      });

      it('should deny login if user is not in database', async () => {
        const user = { email: 'bar@example.com', password: 'bar' };
        await e2eUtils.createUser(user);
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'foo@example.com', password: 'bar' })
          .expect(401);
      });

      it('should deny login if password is wrong', async () => {
        const user = { email: 'foo@example.com', password: 'bar' };
        await e2eUtils.createUser(user);
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'foo@example.com', password: 'baz' })
          .expect(401);
      });

      it('should allow login if is in the database', async () => {
        const user = { email: 'foo@example.com', password: 'bar' };
        await e2eUtils.createUser(user);
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send(user)
          .expect(200);

        expect(response.body.access_token).toBeDefined();
      });
    });
  });
});

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
import { authenticator } from 'otplib';
import { E2EUtils } from '../../framework/tests/e2e-utils';
import { User, UserSchema } from '../users/users.schema';
import { Policy, PolicySchema } from '../policies/policies.schema';
import { Unit, UnitSchema } from '../units/units.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organizations/organizations.schema';
import { Role, RoleSchema } from '../roles/roles.schema';
import { TwoFAService } from './2fa.service';

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
      providers: [JwtService, TwoFAService],
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

    describe('POST /auth/validate2FA', () => {
      it('should fail if user is not logged in', async () => {
        await request(app.getHttpServer())
          .post('/auth/validate2FA')
          .send({ token: 'bar' })
          .expect(401);
      });

      it('should validate if token is valid', async () => {
        const secret = 'ABCDEFGH';
        const user = await e2eUtils.createUserWithProperties(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [],
          {
            twoFactorAuthenticationSecret: secret,
            isTwoFactorAuthenticationEnabled: true,
          },
        );
        const accessToken = await e2eUtils.login(user);
        await request(app.getHttpServer())
          .post('/auth/validate2FA')
          .send({ token: authenticator.generate(secret) })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });

      it('should fail if token is not valid', async () => {
        const user = await e2eUtils.createUserWithProperties(
          {
            email: 'foo@example.com',
            password: 'bar',
          },
          [],
          {
            twoFactorAuthenticationSecret: 'ABCDEFGH',
            isTwoFactorAuthenticationEnabled: true,
          },
        );
        const accessToken = await e2eUtils.login(user);
        await request(app.getHttpServer())
          .post('/auth/validate2FA')
          .send({ token: 'AAAAAA' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(401);
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

    describe('PUT /auth/password', () => {
      it('should deny change password if the user is not logged in', async () => {
        await request(app.getHttpServer())
          .put('/auth/password')
          .send({ oldPassword: 'Foo', newPassword: 'Bar' })
          .expect(401);
      });

      it('should raise an error if old password or new password are empty', async () => {
        const user = { email: 'foo@example.com', password: 'bar' };
        const responseUser = await e2eUtils.createUser(user);
        const accessToken = await e2eUtils.login(responseUser);
        await request(app.getHttpServer())
          .put('/auth/password')
          .send()
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);

        await request(app.getHttpServer())
          .put('/auth/password')
          .send({ oldPassword: '' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);

        await request(app.getHttpServer())
          .put('/auth/password')
          .send({ newPassword: '' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);

        await request(app.getHttpServer())
          .put('/auth/password')
          .send({ oldPassword: '', newPassword: '' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);

        await request(app.getHttpServer())
          .put('/auth/password')
          .send({ oldPassword: 'Foo', newPassword: '' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);

        await request(app.getHttpServer())
          .put('/auth/password')
          .send({ oldPassword: '', newPassword: 'Foo' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);

        await request(app.getHttpServer())
          .put('/auth/password')
          .send({ oldPassword: 123, newPassword: 456 })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(400);
      });

      it('should be able to change password', async () => {
        const user = { email: 'foo@example.com', password: 'bar' };
        const responseUser = await e2eUtils.createUser(user);
        const accessToken = await e2eUtils.login(responseUser);
        await request(app.getHttpServer())
          .put('/auth/password')
          .send({ oldPassword: 'bar', newPassword: 'foo' })
          .set('Authorization', 'bearer ' + accessToken)
          .expect(200);
      });
    });

    describe('POST /auth/recover-password', () => {
      it('should be able to recover password', async () => {
        const unit = await e2eUtils.getUnit();
        const user = {
          email: 'foo@example.com',
          password: await e2eUtils.createPasswordHash('bar'),
          unit,
        };
        const responseUser = await new userModel(user).save();

        await request(app.getHttpServer())
          .post('/auth/recover-password')
          .send({ email: responseUser.email })
          .expect(200);
      });

      it('should be respond with 200 even there is no user', async () => {
        await request(app.getHttpServer())
          .post('/auth/recover-password')
          .send({ email: 'my@email.com' })
          .expect(200);
      });

      it('should fail is the email is not given', async () => {
        const unit = await e2eUtils.getUnit();
        const user = {
          email: 'foo@example.com',
          password: await e2eUtils.createPasswordHash('bar'),
          unit,
        };
        await new userModel(user).save();

        await request(app.getHttpServer())
          .post('/auth/recover-password')
          .send({})
          .expect(400);
      });
    });

    describe('POST /auth/reset-password', () => {
      it('should be able to reset password', async () => {
        const token = 'foo';
        const unit = await e2eUtils.getUnit();
        const user = {
          email: 'foo@example.com',
          password: await e2eUtils.createPasswordHash('bar'),
          unit,
          recoveryToken: token,
          recoveryTokenExpiredAt: new Date(Date.now() + 60 * 60 * 1000),
        };
        const responseUser = await new userModel(user).save();

        await request(app.getHttpServer())
          .post('/auth/reset-password')
          .send({ email: responseUser.email, token, newPassword: 'foo' })
          .expect(200);
      });

      it('should fail is the email, token or new password is not given', async () => {
        const token = 'foo';
        const unit = await e2eUtils.getUnit();
        const user = {
          email: 'foo@example.com',
          password: await e2eUtils.createPasswordHash('bar'),
          unit,
          recoveryToken: token,
          recoveryTokenExpiredAt: new Date(Date.now() + 60 * 60 * 1000),
        };
        const responseUser = await new userModel(user).save();

        await request(app.getHttpServer())
          .post('/auth/reset-password')
          .send({ token, newPassword: 'foo' })
          .expect(400);

        await request(app.getHttpServer())
          .post('/auth/reset-password')
          .send({ email: responseUser.email, newPassword: 'foo' })
          .expect(400);

        await request(app.getHttpServer())
          .post('/auth/reset-password')
          .send({ email: responseUser.email, token })
          .expect(400);
      });

      it('should fail to reset password if the token is wrong or the token has expired', async () => {
        const token = 'foo';
        const unit = await e2eUtils.getUnit();
        const user = {
          email: 'foo@example.com',
          password: await e2eUtils.createPasswordHash('bar'),
          unit,
          recoveryToken: token,
          recoveryTokenExpiredAt: new Date(Date.now() + 60 * 60 * 1000),
        };
        const responseUser = await new userModel(user).save();

        await request(app.getHttpServer())
          .post('/auth/reset-password')
          .send({ email: responseUser.email, token: 'bar', newPassword: 'foo' })
          .expect(400);

        const user2 = {
          email: 'foo2@example.com',
          password: await e2eUtils.createPasswordHash('bar'),
          unit,
          recoveryToken: token,
          recoveryTokenExpiredAt: new Date(Date.now() - 60 * 60 * 1000),
        };
        const responseUser2 = await new userModel(user2).save();

        await request(app.getHttpServer())
          .post('/auth/reset-password')
          .send({ email: responseUser2.email, token, newPassword: 'foo' })
          .expect(400);
      });
    });
  });
});

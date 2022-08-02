import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { Policy, PolicySchema } from './schemas/policy.schema';
import { PolicyController } from './controllers/policy.controller';
import { PolicyService } from './services/policy.service';

import { User, UserSchema } from './schemas/user.schema';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';

import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { jwtConstants } from './auth.constants';
import { CaslAbilityFactory } from './factories/casl-ability.factory';
import { PoliciesGuard } from './guards/policies.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Policy.name, schema: PolicySchema },
      { name: User.name, schema: UserSchema },
    ]),
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PolicyController, UserController, AuthController],
  providers: [
    PolicyService,
    UserService,
    AuthService,
    LocalStrategy,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PoliciesGuard },
    CaslAbilityFactory,
  ],
  exports: [CaslAbilityFactory],
})
export class AuthModule {}

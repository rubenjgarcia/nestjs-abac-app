import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

import { FrameworkModule } from '../../framework/framework.module';
import { CaslAbilityFactory } from '../../framework/factories/casl-ability.factory';

import { UserService } from '../users/users.service';
import { UsersModule } from '../users/users.module';
import { GroupsModule } from '../groups/groups.module';
import { UnitsModule } from '../units/units.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RolesModule } from '../roles/roles.module';
import { PoliciesModule } from '../policies/policies.module';
import { Jwt2FAStrategy } from './strategies/jwt-2fa.strategy';
import { TwoFAService } from './2fa.service';

@Module({
  imports: [
    FrameworkModule,
    GroupsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    OrganizationsModule,
    PassportModule,
    PoliciesModule,
    RolesModule,
    UnitsModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    CaslAbilityFactory,
    ConfigService,
    JwtStrategy,
    Jwt2FAStrategy,
    LocalStrategy,
    UserService,
    TwoFAService,
  ],
  exports: [AuthService],
})
export class AuthModule {}

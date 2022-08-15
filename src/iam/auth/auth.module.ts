import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { FrameworkModule } from '../../framework/framework.module';
import { CaslAbilityFactory } from '../../framework/factories/casl-ability.factory';
import { PoliciesGuard } from '../../framework/guards/policies.guard';

import { UserService } from '../users/users.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    UsersModule,
    FrameworkModule,
  ],
  controllers: [AuthController],
  providers: [
    UserService,
    AuthService,
    LocalStrategy,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PoliciesGuard },
    CaslAbilityFactory,
    ConfigService,
  ],
  exports: [AuthService],
})
export class AuthModule {}

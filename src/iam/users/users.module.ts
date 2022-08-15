import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from './users.schema';
import { UserController } from './users.controller';
import { UserService } from './users.service';

import { FrameworkModule } from '../../framework/framework.module';
import { CaslAbilityFactory } from '../../framework/factories/casl-ability.factory';
import { PoliciesGuard } from '../../framework/guards/policies.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    FrameworkModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    { provide: APP_GUARD, useClass: PoliciesGuard },
    CaslAbilityFactory,
  ],
  exports: [UserService, MongooseModule],
})
export class UsersModule {}

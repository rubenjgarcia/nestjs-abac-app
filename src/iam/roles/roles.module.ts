import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { Role, RoleSchema } from './roles.schema';
import { RoleController } from './roles.controller';
import { RoleService } from './roles.service';

import { FrameworkModule } from '../../framework/framework.module';
import { CaslAbilityFactory } from '../../framework/factories/casl-ability.factory';
import { PoliciesGuard } from '../../framework/guards/policies.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    FrameworkModule,
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
    UsersModule,
  ],
  controllers: [RoleController],
  providers: [
    CaslAbilityFactory,
    RoleService,
    { provide: APP_GUARD, useClass: PoliciesGuard },
  ],
})
export class RolesModule {}

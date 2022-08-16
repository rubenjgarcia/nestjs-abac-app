import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { Group, GroupSchema } from './groups.schema';
import { GroupController } from './groups.controller';
import { GroupService } from './groups.service';

import { FrameworkModule } from '../../framework/framework.module';
import { CaslAbilityFactory } from '../../framework/factories/casl-ability.factory';
import { PoliciesGuard } from '../../framework/guards/policies.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }]),
    FrameworkModule,
  ],
  controllers: [GroupController],
  providers: [
    GroupService,
    { provide: APP_GUARD, useClass: PoliciesGuard },
    CaslAbilityFactory,
  ],
  exports: [MongooseModule],
})
export class GroupsModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Group, GroupSchema } from './groups.schema';
import { GroupController } from './groups.controller';
import { GroupService } from './groups.service';

import { FrameworkModule } from '../../framework/framework.module';
import { CaslAbilityFactory } from '../../framework/factories/casl-ability.factory';
import { GroupProfile } from './groups.profile';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }]),
    FrameworkModule,
  ],
  controllers: [GroupController],
  providers: [GroupService, CaslAbilityFactory, GroupProfile],
  exports: [MongooseModule, GroupProfile],
})
export class GroupsModule {}

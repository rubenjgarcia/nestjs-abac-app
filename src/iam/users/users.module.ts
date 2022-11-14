import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from './users.schema';
import { UserController } from './users.controller';
import { UserService } from './users.service';

import { FrameworkModule } from '../../framework/framework.module';
import { CaslAbilityFactory } from '../../framework/factories/casl-ability.factory';
import { GroupsModule } from '../groups/groups.module';
import { TwoFAService } from '../auth/2fa.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    FrameworkModule,
    GroupsModule,
  ],
  controllers: [UserController],
  providers: [UserService, CaslAbilityFactory, TwoFAService],
  exports: [UserService, MongooseModule],
})
export class UsersModule {}

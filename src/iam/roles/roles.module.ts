import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Role, RoleSchema } from './roles.schema';
import { RoleController } from './roles.controller';
import { RoleService } from './roles.service';

import { FrameworkModule } from '../../framework/framework.module';
import { CaslAbilityFactory } from '../../framework/factories/casl-ability.factory';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    FrameworkModule,
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
    UsersModule,
  ],
  controllers: [RoleController],
  providers: [CaslAbilityFactory, RoleService],
})
export class RolesModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Policy, PolicySchema } from './policies.schema';
import { PolicyController } from './policies.controller';
import { PolicyService } from './policies.service';

import { FrameworkModule } from '../../framework/framework.module';
import { CaslAbilityFactory } from '../../framework/factories/casl-ability.factory';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Policy.name, schema: PolicySchema }]),
    FrameworkModule,
  ],
  controllers: [PolicyController],
  providers: [PolicyService, CaslAbilityFactory],
})
export class PoliciesModule {}

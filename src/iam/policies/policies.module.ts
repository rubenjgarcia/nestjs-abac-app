import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { Policy, PolicySchema } from './policies.schema';
import { PolicyController } from './policies.controller';
import { PolicyService } from './policies.service';

import { FrameworkModule } from '../../framework/framework.module';
import { CaslAbilityFactory } from '../../framework/factories/casl-ability.factory';
import { PoliciesGuard } from '../../framework/guards/policies.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Policy.name, schema: PolicySchema }]),
    FrameworkModule,
  ],
  controllers: [PolicyController],
  providers: [
    PolicyService,
    { provide: APP_GUARD, useClass: PoliciesGuard },
    CaslAbilityFactory,
  ],
})
export class PoliciesModule {}

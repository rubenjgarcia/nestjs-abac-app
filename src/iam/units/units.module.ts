import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { Unit, UnitSchema } from './units.schema';
import { UnitController } from './units.controller';
import { UnitService } from './units.service';

import { FrameworkModule } from '../../framework/framework.module';
import { CaslAbilityFactory } from '../../framework/factories/casl-ability.factory';
import { PoliciesGuard } from '../../framework/guards/policies.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Unit.name, schema: UnitSchema }]),
    FrameworkModule,
  ],
  controllers: [UnitController],
  providers: [
    UnitService,
    { provide: APP_GUARD, useClass: PoliciesGuard },
    CaslAbilityFactory,
  ],
})
export class UnitsModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Unit, UnitSchema } from './units.schema';
import { UnitController } from './units.controller';
import { UnitService } from './units.service';

import { FrameworkModule } from '../../framework/framework.module';
import { CaslAbilityFactory } from '../../framework/factories/casl-ability.factory';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Unit.name, schema: UnitSchema }]),
    FrameworkModule,
  ],
  controllers: [UnitController],
  providers: [UnitService, CaslAbilityFactory],
})
export class UnitsModule {}

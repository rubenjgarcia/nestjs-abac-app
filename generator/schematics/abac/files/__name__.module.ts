import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { <%= singular(classify(name)) %>, <%= singular(classify(name)) %>Schema } from './<%= name %>.schema';
import { <%= singular(classify(name)) %>Controller } from './<%= name %>.controller';
import { <%= singular(classify(name)) %>Service } from './<%= name %>.service';

import { FrameworkModule } from '../framework/framework.module';
import { CaslAbilityFactory } from '../framework/factories/casl-ability.factory';
import { PoliciesGuard } from '../framework/guards/policies.guard';

@Module({
  imports: [
    FrameworkModule,
    MongooseModule.forFeature([
      { name: <%= singular(classify(name)) %>.name, schema: <%= singular(classify(name)) %>Schema },
    ]),
  ],
  controllers: [<%= singular(classify(name)) %>Controller,],
  providers: [
    CaslAbilityFactory,
    <%= singular(classify(name)) %>Service,
    { provide: APP_GUARD, useClass: PoliciesGuard },
  ],
})
export class <%= classify(name) %>Module {}

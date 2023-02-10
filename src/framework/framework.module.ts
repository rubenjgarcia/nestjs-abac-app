import { Module } from '@nestjs/common';

import { CaslAbilityFactory } from './factories/casl-ability.factory';
import { PoliciesGuard } from './guards/policies.guard';
import { EventsService } from './events/events';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [CaslAbilityFactory, PoliciesGuard, EventsService],
  exports: [CaslAbilityFactory, PoliciesGuard, EventsService],
})
export class FrameworkModule {}

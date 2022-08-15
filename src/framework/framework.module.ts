import { Module } from '@nestjs/common';

import { CaslAbilityFactory } from './factories/casl-ability.factory';
import { PoliciesGuard } from './guards/policies.guard';

@Module({
  providers: [CaslAbilityFactory, PoliciesGuard],
  exports: [CaslAbilityFactory, PoliciesGuard],
})
export class FrameworkModule {}

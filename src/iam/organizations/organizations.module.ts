import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { Organization, OrganizationSchema } from './organizations.schema';
import { OrganizationController } from './organizations.controller';
import { OrganizationService } from './organizations.service';

import { FrameworkModule } from '../../framework/framework.module';
import { CaslAbilityFactory } from '../../framework/factories/casl-ability.factory';
import { PoliciesGuard } from '../../framework/guards/policies.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    FrameworkModule,
  ],
  controllers: [OrganizationController],
  providers: [
    OrganizationService,
    { provide: APP_GUARD, useClass: PoliciesGuard },
    CaslAbilityFactory,
  ],
})
export class OrganizationsModule {}

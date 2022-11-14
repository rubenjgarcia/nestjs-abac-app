import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Organization, OrganizationSchema } from './organizations.schema';
import { OrganizationController } from './organizations.controller';
import { OrganizationService } from './organizations.service';

import { FrameworkModule } from '../../framework/framework.module';
import { CaslAbilityFactory } from '../../framework/factories/casl-ability.factory';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    FrameworkModule,
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService, CaslAbilityFactory],
})
export class OrganizationsModule {}

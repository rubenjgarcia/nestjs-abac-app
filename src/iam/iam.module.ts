import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PoliciesModule } from './policies/policies.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UnitsModule } from './units/units.module';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [
    AuthModule,
    GroupsModule,
    OrganizationsModule,
    PoliciesModule,
    RolesModule,
    UnitsModule,
    UsersModule,
  ],
})
export class IAMModule {}

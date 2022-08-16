import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PoliciesModule } from './policies/policies.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';

@Module({
  imports: [AuthModule, UsersModule, PoliciesModule, GroupsModule],
})
export class IAMModule {}

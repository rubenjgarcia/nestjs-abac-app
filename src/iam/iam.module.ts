import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PoliciesModule } from './policies/policies.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule, UsersModule, PoliciesModule],
})
export class IAMModule {}

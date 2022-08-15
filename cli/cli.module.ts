import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CreateAdminCommand } from './users/create-admin.command';
import { UsersCommand } from './users/users.command';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [ConfigService, UsersCommand, CreateAdminCommand],
})
export class CLIModule {}

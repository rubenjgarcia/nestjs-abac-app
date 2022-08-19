import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CreateOrganizationCommand } from './organizations/create.command';
import { OrganizationsCommand } from './organizations/organizations.command';
import { CreateAdminCommand } from './users/create-admin.command';
import { UsersCommand } from './users/users.command';
import {
  Organization,
  OrganizationSchema,
  UnitSchema,
  UserSchema,
  User,
  Unit,
  Policy,
  PolicySchema,
} from './schemas';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('DATABASE_URI'),
      }),
    }),
    MongooseModule.forFeature([
      {
        name: Organization.name,
        schema: OrganizationSchema,
      },
      {
        name: Unit.name,
        schema: UnitSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Policy.name,
        schema: PolicySchema,
      },
    ]),
  ],
  providers: [
    ConfigService,
    UsersCommand,
    CreateAdminCommand,
    OrganizationsCommand,
    CreateOrganizationCommand,
  ],
})
export class CLIModule {}

import { Command, CommandRunner } from 'nest-commander';
import { CreateAdminCommand } from './create-admin.command';

@Command({
  name: 'users',
  subCommands: [CreateAdminCommand],
})
export class UsersCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Use the subcommand `create-admin`');
  }
}

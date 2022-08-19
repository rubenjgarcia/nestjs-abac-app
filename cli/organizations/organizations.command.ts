import { Command, CommandRunner } from 'nest-commander';
import { CreateOrganizationCommand } from './create.command';

@Command({
  name: 'organizations',
  subCommands: [CreateOrganizationCommand],
})
export class OrganizationsCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Use the subcommand `create`');
  }
}

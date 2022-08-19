import { CommandFactory } from 'nest-commander';
import { CLIModule } from './cli.module';

const bootstrap = async () => {
  await CommandFactory.run(CLIModule, ['warn', 'error']);
};

bootstrap();

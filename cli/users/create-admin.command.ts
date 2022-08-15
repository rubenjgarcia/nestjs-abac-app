import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';
import { CommandRunner, SubCommand } from 'nest-commander';

@SubCommand({ name: 'create-admin', arguments: '<email> <password>' })
export class CreateAdminCommand extends CommandRunner {
  private readonly userModel: mongoose.Model<any>;
  private readonly policyModel: mongoose.Model<any>;

  constructor(private readonly config: ConfigService) {
    super();

    this.userModel = mongoose.model(
      'User',
      new mongoose.Schema({
        email: String,
        password: String,
        policies: [mongoose.Types.ObjectId],
      }),
    );

    this.policyModel = mongoose.model(
      'Policy',
      new mongoose.Schema({
        name: String,
        effect: String,
        actions: [String],
        resources: [String],
      }),
    );
  }

  async run(passedParams: string[]): Promise<void> {
    await mongoose.connect(this.config.get<string>('DATABASE_URI'));
    try {
      let policy = await this.policyModel.findOne({ name: 'Administrator' });
      if (policy === null) {
        policy = await this.policyModel.create({
          name: 'Administrator',
          effect: 'Allow',
          actions: ['*'],
          resources: ['*'],
        });
      }

      const hash = await bcrypt.hash(passedParams[1], 10);
      const email = passedParams[0];
      await this.userModel.create({
        email,
        password: hash,
        policies: [policy._id],
      });
      console.log(`User ${email} created successfully`);
    } finally {
      mongoose.connection.close();
    }
  }
}

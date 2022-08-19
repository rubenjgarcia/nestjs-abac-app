import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Types, Model } from 'mongoose';
import { CommandRunner, SubCommand } from 'nest-commander';
import { InjectModel } from '@nestjs/mongoose';
import {
  Unit,
  UnitDocument,
  User,
  UserDocument,
  Policy,
  PolicyDocument,
} from '../schemas';

@SubCommand({
  name: 'create-admin',
  arguments: '<unit> <email> <password>',
})
export class CreateAdminCommand extends CommandRunner {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(Unit.name)
    private readonly unitModel: Model<UnitDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Policy.name)
    private readonly policyModel: Model<PolicyDocument>,
  ) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    try {
      const unitId = passedParams[0];
      const unit = await this.unitModel.findOne({
        _id: new Types.ObjectId(unitId),
      });
      if (!unit) {
        console.error(
          `[ERROR] - Unit with id ${unitId} does not exist in database`,
        );
        process.exit(1);
      }

      let policy = await this.policyModel.findOne({
        name: 'Administrator',
        unit: unit._id,
      });
      if (!policy) {
        policy = await this.policyModel.create({
          name: 'Administrator',
          effect: 'Allow',
          actions: ['*'],
          resources: ['*'],
          unit: unit._id,
        });
        console.log('Administrator policy created successfully in unit');
      } else {
        console.log(`Using Administrator policy from unit`);
      }

      const email = passedParams[1];
      const hash = await bcrypt.hash(passedParams[2], 10);
      await this.userModel.create({
        email,
        password: hash,
        policies: [policy._id],
        unit: unit._id,
      });
      console.log(`User ${email} created successfully`);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  }
}

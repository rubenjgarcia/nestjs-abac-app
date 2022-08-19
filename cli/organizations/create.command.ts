import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommandRunner, SubCommand } from 'nest-commander';
import {
  Unit,
  UnitDocument,
  Organization,
  OrganizationDocument,
} from '../schemas';

@SubCommand({ name: 'create', arguments: '<name>' })
export class CreateOrganizationCommand extends CommandRunner {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(Unit.name)
    private readonly unitModel: Model<UnitDocument>,
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<OrganizationDocument>,
  ) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    try {
      const name = passedParams[0];
      const organization = await this.organizationModel.create({ name });
      const unit = await this.unitModel.create({
        name: 'Root',
        organization: organization._id,
      });
      console.log(`Organization ${name} created successfully`);
      console.log(
        `Unit ${unit.name} created in organization ${name} with id ${unit._id}`,
      );
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  }
}

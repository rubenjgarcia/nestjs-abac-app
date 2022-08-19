import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../../iam/users/dtos/create-user.dto';
import { CreatePolicyDto } from '../../iam/policies/dtos/create-policy.dto';
import { User } from '../../iam/users/users.schema';
import { Policy } from '../../iam/policies/policies.schema';
import { Unit } from '../../iam/units/units.schema';
import { Organization } from '../../iam/organizations/organizations.schema';

export class E2EUtils {
  constructor(
    readonly userModel: Model<User>,
    readonly policyModel: Model<Policy>,
    readonly unitModel: Model<Unit>,
    readonly organizationModel: Model<Organization>,
    private jwtService: JwtService,
  ) {}

  async createPolicy(policy: CreatePolicyDto): Promise<Policy> {
    const unit = await this.getUnit();
    return await new this.policyModel({ ...policy, unit }).save();
  }

  async createUser(
    user: CreateUserDto,
    policies?: CreatePolicyDto | CreatePolicyDto[],
  ): Promise<User> {
    const unit = await this.getUnit();
    const hash = await bcrypt.hash(user.password, 10);
    if (policies !== undefined) {
      const savedPolicies = await Promise.all(
        [].concat(policies).map(async (p) => {
          const savedPolicy = await this.createPolicy(p);
          return savedPolicy._id.toString();
        }),
      );
      return await new this.userModel({
        ...user,
        password: hash,
        policies: savedPolicies,
        unit,
      }).save();
    } else {
      return await new this.userModel({ ...user, password: hash, unit }).save();
    }
  }

  async createUserAndLogin(
    user: CreateUserDto,
    policies?: CreatePolicyDto | CreatePolicyDto[],
  ) {
    await this.createUser(user, policies);
    return await this.jwtService.sign({
      email: user.email,
    });
  }

  async getUnit(): Promise<Unit> {
    const unit = await this.unitModel.findOne({ name: 'FooUnit' });
    if (unit === null) {
      const organization = await new this.organizationModel({
        _id: new Types.ObjectId('000000000000'),
        name: 'FooOrganization',
      }).save();
      return await new this.unitModel({
        _id: new Types.ObjectId('000000000000'),
        name: 'FooUnit',
        organization,
      }).save();
    } else {
      return unit;
    }
  }
}

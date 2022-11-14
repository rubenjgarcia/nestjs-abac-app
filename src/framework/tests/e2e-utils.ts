import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../../iam/users/dtos/create-user.dto';
import { CreatePolicyDto } from '../../iam/policies/dtos/create-policy.dto';
import { User } from '../../iam/users/users.schema';
import { Policy } from '../../iam/policies/policies.schema';
import { Unit } from '../../iam/units/units.schema';
import { Organization } from '../../iam/organizations/organizations.schema';
import { Role } from '../../iam/roles/roles.schema';

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

  async createPasswordHash(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  async createUser(
    user: CreateUserDto,
    policies?: CreatePolicyDto | CreatePolicyDto[],
  ): Promise<User> {
    return this.createUserWithProperties(user, policies);
  }

  async createUserWithProperties(
    user: CreateUserDto,
    policies?: CreatePolicyDto | CreatePolicyDto[],
    properties?: Partial<User>,
  ): Promise<User> {
    const unit = await this.getUnit();
    const hash = await this.createPasswordHash(user.password);
    if (policies !== undefined) {
      const savedPolicies = await Promise.all(
        [].concat(policies).map(async (p) => {
          const savedPolicy = await this.createPolicy(p);
          return savedPolicy._id.toString();
        }),
      );
      return await new this.userModel({
        ...user,
        ...(properties ? properties : {}),
        password: hash,
        policies: savedPolicies,
        unit,
      }).save();
    } else {
      return await new this.userModel({ ...user, password: hash, unit }).save();
    }
  }

  async login(user: User): Promise<string> {
    const payload = {
      email: user.email,
      sub: user._id,
      unit: user.unit._id.toString(),
      organization: user.unit.organization._id.toString(),
      roles: user.roles ? user.roles.map((r: Role) => r._id.toString()) : null,
      twoFactorAuthentication: user.isTwoFactorAuthenticationEnabled || false,
    };
    return await this.jwtService.sign(payload);
  }

  async createUserAndLogin(
    user: CreateUserDto,
    policies?: CreatePolicyDto | CreatePolicyDto[],
  ) {
    const responseUser = await this.createUser(user, policies);
    return await this.login(responseUser);
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

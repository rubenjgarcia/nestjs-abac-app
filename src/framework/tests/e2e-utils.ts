import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../../iam/users/dtos/create-user.dto';
import { CreatePolicyDto } from '../../iam/policies/dtos/create-policy.dto';
import { User } from '../../iam/users/users.schema';
import { Policy } from 'src/iam/policies/policies.schema';

export class E2EUtils {
  constructor(
    readonly userModel: Model<User>,
    readonly policyModel: Model<Policy>,
    private jwtService: JwtService,
  ) {}

  async createPolicy(policy: CreatePolicyDto): Promise<Policy> {
    return await new this.policyModel(policy).save();
  }

  async createUser(
    user: CreateUserDto,
    policies?: CreatePolicyDto | CreatePolicyDto[],
  ): Promise<User> {
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
      }).save();
    } else {
      return await new this.userModel({ ...user, password: hash }).save();
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
}

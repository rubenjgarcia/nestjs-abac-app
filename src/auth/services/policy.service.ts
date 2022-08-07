import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ForbiddenError, subject } from '@casl/ability';
import { Policy, PolicyDocument } from '../schemas/policy.schema';
import { CreatePolicyDto, UpdatePolicyDto } from '../dtos/policies';
import {
  CaslAbilityFactory,
  WithPolicies,
} from '../factories/casl-ability.factory';
import {
  CreatePolicy,
  GetPolicy,
  ListPolicies,
  RemovePolicy,
  UpdatePolicy,
} from '../actions/policy.actions';
import { AccessibleRecordModel } from '@casl/mongoose';

@Injectable()
export class PolicyService {
  constructor(
    @InjectModel(Policy.name)
    private policyModel: AccessibleRecordModel<PolicyDocument>,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async create(
    createPolicyDto: CreatePolicyDto,
    withPolicies: WithPolicies,
  ): Promise<Policy> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    ForbiddenError.from(ability).throwUnlessCan(
      CreatePolicy,
      subject('Policy', createPolicyDto),
    );
    return await this.policyModel.create(createPolicyDto);
  }

  async findAll(withPolicies: WithPolicies): Promise<Policy[]> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return this.policyModel.find().accessibleBy(ability, ListPolicies).exec();
  }

  async findOne(id: string, withPolicies: WithPolicies): Promise<Policy> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return await this.policyModel
      .accessibleBy(ability, GetPolicy)
      .findOne({ _id: new Types.ObjectId(id) })
      .orFail()
      .select({ password: false, policies: false });
  }

  async update(
    id: string,
    updateUserDto: UpdatePolicyDto,
    withPolicies: WithPolicies,
  ): Promise<Policy> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return await this.policyModel
      .accessibleBy(ability, UpdatePolicy)
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id) },
        { $set: updateUserDto },
        { new: true },
      )
      .orFail();
  }

  async remove(id: string, withPolicies: WithPolicies) {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    await this.policyModel
      .accessibleBy(ability, RemovePolicy)
      .findOneAndDelete({ _id: new Types.ObjectId(id) })
      .orFail();
  }
}

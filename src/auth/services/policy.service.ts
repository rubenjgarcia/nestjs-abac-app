import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Policy, PolicyDocument } from '../schemas/policy.schema';
import { CreatePolicyDto } from '../dtos/policies';

@Injectable()
export class PolicyService {
  constructor(
    @InjectModel(Policy.name) private policyModel: Model<PolicyDocument>,
  ) {}

  async create(createPolicyDto: CreatePolicyDto): Promise<Policy> {
    return await this.policyModel.create(createPolicyDto);
  }

  async findAll(): Promise<Policy[]> {
    return this.policyModel.find().exec();
  }

  async findOne(id: string): Promise<Policy> {
    return this.policyModel.findOne({ _id: id }).exec();
  }
}

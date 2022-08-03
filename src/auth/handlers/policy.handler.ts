import { Types } from 'mongoose';
import { Ability, subject } from '@casl/ability';
import {
  ListPolicies,
  GetPolicy,
  CreatePolicy,
  PolicyScope,
  RemovePolicy,
  UpdatePolicy,
} from '../actions/policy.actions';
import { IPolicyHandler } from './handler-definition';

export class ListPolicysPolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(ListPolicies, subject(PolicyScope, {}));
  }
}

export class CreatePolicysPolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(CreatePolicy, subject(PolicyScope, {}));
  }
}

export class GetPolicyPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      GetPolicy,
      subject(PolicyScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

export class UpdatePolicyPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      UpdatePolicy,
      subject(PolicyScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

export class RemovePolicyPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      RemovePolicy,
      subject(PolicyScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

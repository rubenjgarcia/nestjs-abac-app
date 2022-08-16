import { Types } from 'mongoose';
import { Ability, subject } from '@casl/ability';
import {
  ListGroups,
  GetGroup,
  CreateGroup,
  GroupScope,
  RemoveGroup,
  UpdateGroup,
} from './groups.actions';
import { IPolicyHandler } from '../../framework/handler-definition';

export class ListGroupsPolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(ListGroups, subject(GroupScope, {}));
  }
}

export class CreateGroupPolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(CreateGroup, subject(GroupScope, {}));
  }
}

export class GetGroupPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      GetGroup,
      subject(GroupScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

export class UpdateGroupPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      UpdateGroup,
      subject(GroupScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

export class RemoveGroupPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      RemoveGroup,
      subject(GroupScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

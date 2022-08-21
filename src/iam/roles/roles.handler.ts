import { Types } from 'mongoose';
import { Ability, subject } from '@casl/ability';
import {
  ListRoles,
  GetRole,
  CreateRole,
  RoleScope,
  RemoveRole,
  UpdateRole,
  AddRoleToUser,
  RemoveRoleFromUser,
} from './roles.actions';
import { IPolicyHandler } from '../../framework/handler-definition';

export class ListRolesPolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(ListRoles, subject(RoleScope, {}));
  }
}

export class CreateRolePolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(CreateRole, subject(RoleScope, {}));
  }
}

export class GetRolePolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      GetRole,
      subject(RoleScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

export class UpdateRolePolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      UpdateRole,
      subject(RoleScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

export class RemoveRolePolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      RemoveRole,
      subject(RoleScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

export class AddRoleToUserPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      AddRoleToUser,
      subject(RoleScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

export class RemoveRoleFromUserPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      RemoveRoleFromUser,
      subject(RoleScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

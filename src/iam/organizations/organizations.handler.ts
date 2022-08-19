import { Types } from 'mongoose';
import { Ability, subject } from '@casl/ability';
import {
  ListOrganizations,
  GetOrganization,
  CreateOrganization,
  OrganizationScope,
  RemoveOrganization,
  UpdateOrganization,
} from './organizations.actions';
import { IPolicyHandler } from '../../framework/handler-definition';

export class ListOrganizationsPolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(ListOrganizations, subject(OrganizationScope, {}));
  }
}

export class CreateOrganizationPolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(CreateOrganization, subject(OrganizationScope, {}));
  }
}

export class GetOrganizationPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      GetOrganization,
      subject(OrganizationScope, {
        _id: new Types.ObjectId(params[this.param]),
      }),
    );
  }
}

export class UpdateOrganizationPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      UpdateOrganization,
      subject(OrganizationScope, {
        _id: new Types.ObjectId(params[this.param]),
      }),
    );
  }
}

export class RemoveOrganizationPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      RemoveOrganization,
      subject(OrganizationScope, {
        _id: new Types.ObjectId(params[this.param]),
      }),
    );
  }
}

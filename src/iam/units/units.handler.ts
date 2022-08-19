import { Types } from 'mongoose';
import { Ability, subject } from '@casl/ability';
import {
  ListUnits,
  GetUnit,
  CreateUnit,
  UnitScope,
  RemoveUnit,
  UpdateUnit,
  CreateChildUnit,
} from './units.actions';
import { IPolicyHandler } from '../../framework/handler-definition';

export class ListUnitsPolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(ListUnits, subject(UnitScope, {}));
  }
}

export class CreateUnitPolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(CreateUnit, subject(UnitScope, {}));
  }
}

export class GetUnitPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      GetUnit,
      subject(UnitScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

export class UpdateUnitPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      UpdateUnit,
      subject(UnitScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

export class RemoveUnitPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      RemoveUnit,
      subject(UnitScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

export class CreateChildUnitPolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(CreateChildUnit, subject(UnitScope, {}));
  }
}

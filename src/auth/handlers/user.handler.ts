import { Types } from 'mongoose';
import { Ability, subject } from '@casl/ability';
import {
  ListUsers,
  GetUser,
  CreateUser,
  UserScope,
} from '../actions/user.actions';
import { IPolicyHandler } from './handler-definition';

export class ListUsersPolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(ListUsers, subject(UserScope, {}));
  }
}

export class CreateUsersPolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(CreateUser, subject(UserScope, {}));
  }
}

export class GetUserPolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      GetUser,
      subject(UserScope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

import { Types } from 'mongoose';
import { Ability, subject } from '@casl/ability';
import {
  List<%= classify(name) %>,
  Get<%= singular(classify(name)) %>,
  Create<%= singular(classify(name)) %>,
  <%= singular(classify(name)) %>Scope,
  Remove<%= singular(classify(name)) %>,
  Update<%= singular(classify(name)) %>,
} from './<%= name %>.actions';
import { IPolicyHandler } from '../framework/handler-definition';

export class List<%= classify(name) %>PolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(List<%= classify(name) %>, subject(<%= singular(classify(name)) %>Scope, {}));
  }
}

export class Create<%= singular(classify(name)) %>PolicyHandler implements IPolicyHandler {
  handle(ability: Ability) {
    return ability.can(Create<%= singular(classify(name)) %>, subject(<%= singular(classify(name)) %>Scope, {}));
  }
}

export class Get<%= singular(classify(name)) %>PolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      Get<%= singular(classify(name)) %>,
      subject(<%= singular(classify(name)) %>Scope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

export class Update<%= singular(classify(name)) %>PolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      Update<%= singular(classify(name)) %>,
      subject(<%= singular(classify(name)) %>Scope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

export class Remove<%= singular(classify(name)) %>PolicyHandler implements IPolicyHandler {
  private readonly param: string;

  constructor(param: string) {
    this.param = param;
  }

  handle(ability: Ability, params: any) {
    return ability.can(
      Remove<%= singular(classify(name)) %>,
      subject(<%= singular(classify(name)) %>Scope, { _id: new Types.ObjectId(params[this.param]) }),
    );
  }
}

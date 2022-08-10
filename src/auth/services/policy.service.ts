import { Injectable } from '@nestjs/common';
import { Policy, PolicyDocument } from '../schemas/policy.schema';
import { PolicyCrudActions } from '../actions/policy.actions';
import { CrudService } from '../../common/crud.service';
import { AccessibleRecordModel } from '@casl/mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class PolicyService extends CrudService<PolicyDocument> {
  constructor(
    @InjectModel(Policy.name)
    model: AccessibleRecordModel<PolicyDocument>,
  ) {
    super(model, new PolicyCrudActions());
  }
}

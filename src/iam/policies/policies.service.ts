import { Injectable } from '@nestjs/common';
import { Policy, PolicyDocument } from './policies.schema';
import { PolicyCrudActions } from './policies.actions';
import { CrudService } from '../../framework/crud.service';
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

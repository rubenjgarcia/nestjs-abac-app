import { Injectable } from '@nestjs/common';
import { Group, GroupDocument } from './groups.schema';
import { GroupCrudActions } from './groups.actions';
import { AccessibleRecordModel } from '@casl/mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CrudService } from '../../framework/crud.service';

@Injectable()
export class GroupService extends CrudService<GroupDocument> {
  constructor(
    @InjectModel(Group.name)
    model: AccessibleRecordModel<GroupDocument>,
  ) {
    super(model, new GroupCrudActions());
  }
}

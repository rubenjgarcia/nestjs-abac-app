import { Injectable } from '@nestjs/common';
import { Group, GroupDocument } from './groups.schema';
import { GroupCrudActions } from './groups.actions';
import { AccessibleRecordModel } from '@casl/mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CrudService } from '../../framework/crud.service';
import { GroupResponseDto } from './dtos/group-response.dto';

@Injectable()
export class GroupService extends CrudService<GroupDocument, GroupResponseDto> {
  constructor(
    @InjectModel(Group.name)
    model: AccessibleRecordModel<GroupDocument>,
  ) {
    super(model, new GroupCrudActions());
  }
}

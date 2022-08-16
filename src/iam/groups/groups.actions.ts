import { CrudActions } from '../../framework/actions';

export const GroupScope = 'Group';

export const ListGroups = 'ListGroups';
export const GetGroup = 'GetGroup';
export const CreateGroup = 'CreateGroup';
export const UpdateGroup = 'UpdateGroup';
export const RemoveGroup = 'RemoveGroup';

export class GroupCrudActions implements CrudActions {
  scope = GroupScope;
  createAction = CreateGroup;
  getAction = GetGroup;
  listAction = ListGroups;
  updateAction = UpdateGroup;
  removeAction = RemoveGroup;
}

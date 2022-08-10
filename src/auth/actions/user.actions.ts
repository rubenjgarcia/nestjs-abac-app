import { CrudActions } from '../../common/actions';

export const UserScope = 'User';

export const ListUsers = 'ListUsers';
export const GetUser = 'GetUser';
export const CreateUser = 'CreateUser';
export const UpdateUser = 'UpdateUser';
export const RemoveUser = 'RemoveUser';

export class UserCrudActions implements CrudActions {
  scope = UserScope;
  createAction = CreateUser;
  getAction = GetUser;
  listAction = ListUsers;
  updateAction = UpdateUser;
  removeAction = RemoveUser;
}

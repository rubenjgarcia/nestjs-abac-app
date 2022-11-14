import { CrudActions } from '../../framework/actions';

export const UserScope = 'User';

export const ListUsers = 'ListUsers';
export const GetUser = 'GetUser';
export const CreateUser = 'CreateUser';
export const UpdateUser = 'UpdateUser';
export const RemoveUser = 'RemoveUser';
export const AddGroupToUser = 'AddGroupToUser';
export const Activate2FA = 'Activate2FA';

export class UserCrudActions implements CrudActions {
  scope = UserScope;
  createAction = CreateUser;
  getAction = GetUser;
  listAction = ListUsers;
  updateAction = UpdateUser;
  removeAction = RemoveUser;
}

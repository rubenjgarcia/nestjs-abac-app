import { CrudActions } from '../../framework/actions';

export const RoleScope = 'Role';

export const ListRoles = 'ListRoles';
export const GetRole = 'GetRole';
export const CreateRole = 'CreateRole';
export const UpdateRole = 'UpdateRole';
export const RemoveRole = 'RemoveRole';
export const AddRoleToUser = 'AddRoleToUser';
export const RemoveRoleFromUser = 'RemoveRoleFromUser';

export class RoleCrudActions implements CrudActions {
  scope = RoleScope;
  createAction = CreateRole;
  getAction = GetRole;
  listAction = ListRoles;
  updateAction = UpdateRole;
  removeAction = RemoveRole;
}

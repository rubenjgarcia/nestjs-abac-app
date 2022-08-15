import { CrudActions } from '../../framework/actions';

export const PolicyScope = 'Policy';

export const ListPolicies = 'ListPolicies';
export const GetPolicy = 'GetPolicy';
export const CreatePolicy = 'CreatePolicy';
export const UpdatePolicy = 'UpdatePolicy';
export const RemovePolicy = 'RemovePolicy';

export class PolicyCrudActions implements CrudActions {
  scope = PolicyScope;
  createAction = CreatePolicy;
  getAction = GetPolicy;
  listAction = ListPolicies;
  updateAction = UpdatePolicy;
  removeAction = RemovePolicy;
}

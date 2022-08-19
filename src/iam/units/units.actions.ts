import { CrudActions } from '../../framework/actions';

export const UnitScope = 'Unit';

export const ListUnits = 'ListUnits';
export const GetUnit = 'GetUnit';
export const CreateUnit = 'CreateUnit';
export const CreateChildUnit = 'CreateChildUnit';
export const UpdateUnit = 'UpdateUnit';
export const RemoveUnit = 'RemoveUnit';

export class UnitCrudActions implements CrudActions {
  scope = UnitScope;
  createAction = CreateUnit;
  getAction = GetUnit;
  listAction = ListUnits;
  updateAction = UpdateUnit;
  removeAction = RemoveUnit;
}

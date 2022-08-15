import { CrudActions } from '../framework/actions';

export const <%= singular(classify(name)) %>Scope = '<%= singular(classify(name)) %>';

export const List<%= classify(name) %> = 'List<%= classify(name) %>';
export const Get<%= singular(classify(name)) %> = 'Get<%= singular(classify(name)) %>';
export const Create<%= singular(classify(name)) %> = 'Create<%= singular(classify(name)) %>';
export const Update<%= singular(classify(name)) %> = 'Update<%= singular(classify(name)) %>';
export const Remove<%= singular(classify(name)) %> = 'Remove<%= singular(classify(name)) %>';

export class <%= singular(classify(name)) %>CrudActions implements CrudActions {
  scope = <%= singular(classify(name)) %>Scope;
  createAction = Create<%= singular(classify(name)) %>;
  getAction = Get<%= singular(classify(name)) %>;
  listAction = List<%= classify(name) %>;
  updateAction = Update<%= singular(classify(name)) %>;
  removeAction = Remove<%= singular(classify(name)) %>;
}

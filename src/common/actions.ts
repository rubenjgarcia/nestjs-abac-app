export interface CrudActions {
  readonly scope: string;
  readonly createAction: string;
  readonly getAction: string;
  readonly listAction: string;
  readonly updateAction: string;
  readonly removeAction: string;
}

export interface IEvent<T> {
  scope: string;
  name: string;
  payload: T;
}

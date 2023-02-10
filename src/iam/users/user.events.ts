import { IEvent } from 'src/framework/events/iEvent';
import { UserDocument } from './users.schema';

export const UserEventsScope = 'user';

export class UserCreatedEvent implements IEvent<UserDocument> {
  readonly scope = UserEventsScope;
  readonly name = 'created';

  constructor(readonly payload: UserDocument) {}
}

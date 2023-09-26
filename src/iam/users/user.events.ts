import { IEvent } from 'src/framework/events/iEvent';
import { UserResponseDto } from './dtos/user-response.dto';

export const UserEventsScope = 'user';

export class UserCreatedEvent implements IEvent<UserResponseDto> {
  readonly scope = UserEventsScope;
  readonly name = 'created';

  constructor(readonly payload: UserResponseDto) {}
}

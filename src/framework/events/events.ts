import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IEvent } from './iEvent';

@Injectable()
export class EventsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async emit(event: IEvent<Record<string, any>>) {
    this.eventEmitter.emit(`${event.scope}.${event.name}`, event.payload);
  }
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Entity } from '../framework/entity';
import { Unit } from '../iam/units/units.schema';

export type <%= singular(classify(name)) %>Document = <%= singular(classify(name)) %> & Document;

@Schema()
export class <%= singular(classify(name)) %> implements Entity {
  _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Unit.name,
    required: true,
    index: true,
  })
  unit: Unit;
}

export const <%= singular(classify(name)) %>Schema = SchemaFactory.createForClass(<%= singular(classify(name)) %>);

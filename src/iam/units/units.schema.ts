import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Unit as IUnit } from '../../framework/unit';
import { Organization } from '../organizations/organizations.schema';

export type UnitDocument = Unit & Document;

@Schema()
export class Unit implements IUnit {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({
    type: Types.ObjectId,
    ref: Organization.name,
    required: true,
  })
  organization: Organization;

  @Prop({
    type: Types.ObjectId,
    ref: Unit.name,
  })
  parent?: Unit;

  @Prop({
    type: [Types.ObjectId],
    ref: Unit.name,
    _id: false,
  })
  ancestors?: Unit[];
}

export const UnitSchema = SchemaFactory.createForClass(Unit);
UnitSchema.index({ ancestors: 1 });

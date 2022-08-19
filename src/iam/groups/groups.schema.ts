import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WithPolicies } from '../../framework/factories/casl-ability.factory';
import { Entity } from '../../framework/entity';
import { Policy } from '../policies/policies.schema';
import { Unit } from '../units/units.schema';

export type GroupDocument = Group & Document;

@Schema()
export class Group implements WithPolicies, Entity {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({
    type: [Types.ObjectId],
    ref: Policy.name,
  })
  policies?: Policy[];

  @Prop({
    type: Types.ObjectId,
    ref: Unit.name,
    required: true,
    index: true,
  })
  unit: Unit;
}

export const GroupSchema = SchemaFactory.createForClass(Group);

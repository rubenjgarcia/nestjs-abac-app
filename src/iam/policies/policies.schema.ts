import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { Entity } from '../../framework/entity';
import {
  AbilityPolicy,
  Condition,
  Effect,
} from '../../framework/factories/casl-ability.factory';
import { Unit } from '../units/units.schema';

export type PolicyDocument = Policy & Document;

@Schema()
export class Policy implements AbilityPolicy, Entity {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  effect: Effect;

  @Prop({ required: true })
  actions: string[];

  @Prop({ required: true })
  resources: string[];

  @Prop({ type: MongooseSchema.Types.Mixed })
  condition?: Condition;

  @Prop({
    type: Types.ObjectId,
    ref: Unit.name,
    required: true,
    index: true,
  })
  unit: Unit;
}

export const PolicySchema = SchemaFactory.createForClass(Policy);
PolicySchema.index({ name: 1, unit: 1 });

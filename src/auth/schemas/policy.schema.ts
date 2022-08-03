import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AbilityPolicy, Effect } from '../factories/casl-ability.factory';

export type PolicyDocument = Policy & Document;

@Schema()
export class Policy implements AbilityPolicy {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  effect: Effect;

  @Prop({ required: true })
  actions: string[];

  @Prop({ required: true })
  resources: string[];
}

export const PolicySchema = SchemaFactory.createForClass(Policy);

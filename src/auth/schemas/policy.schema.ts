import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PolicyDocument = Policy & Document;

export enum Effect {
  Allow = 'Allow',
  Deny = 'Deny',
}

@Schema()
export class Policy {
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

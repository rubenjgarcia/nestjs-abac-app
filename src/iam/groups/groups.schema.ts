import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WithPolicies } from '../../framework/factories/casl-ability.factory';
import { Policy } from '../policies/policies.schema';

export type GroupDocument = Group & Document;

@Schema()
export class Group implements WithPolicies {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({
    type: [Types.ObjectId],
    ref: Policy.name,
  })
  policies?: Policy[];
}

export const GroupSchema = SchemaFactory.createForClass(Group);

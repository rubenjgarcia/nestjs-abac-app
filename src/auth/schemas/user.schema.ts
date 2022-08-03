import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Policy } from './policy.schema';
import { WithPolicies } from '../factories/casl-ability.factory';

export type UserDocument = User & Document;

@Schema()
export class User implements WithPolicies {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: [mongoose.Schema.Types.ObjectId],
    ref: Policy.name,
  })
  policies?: Policy[];
}

export const UserSchema = SchemaFactory.createForClass(User);

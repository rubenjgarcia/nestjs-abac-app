import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Policy } from './policy.schema';
import { WithPolicies } from '../factories/casl-ability.factory';
import { isEmail } from 'class-validator';

export type UserDocument = User & Document;

@Schema()
export class User implements WithPolicies {
  _id: Types.ObjectId;

  @Prop({
    required: true,
    unique: true,
    validate: [isEmail, 'Must be a valid email'],
  })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: [Types.ObjectId],
    ref: Policy.name,
  })
  policies?: Policy[];
}

export const UserSchema = SchemaFactory.createForClass(User);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { isEmail } from 'class-validator';
import { WithPolicies } from '../../framework/factories/casl-ability.factory';
import { Policy } from '../policies/policies.schema';
import { Group } from '../groups/groups.schema';

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
    _id: false,
  })
  policies?: Policy[];

  @Prop({
    type: [Types.ObjectId],
    ref: Group.name,
    _id: false,
  })
  groups?: Group[];
}

export const UserSchema = SchemaFactory.createForClass(User);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { isEmail } from 'class-validator';
import { WithPolicies } from '../../framework/factories/casl-ability.factory';
import { Entity } from '../../framework/entity';
import { Policy } from '../policies/policies.schema';
import { Group } from '../groups/groups.schema';
import { Unit } from '../units/units.schema';
import { Role } from '../roles/roles.schema';

export type UserDocument = User & Document;

@Schema()
export class User implements WithPolicies, Entity {
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

  @Prop({
    type: [Types.ObjectId],
    ref: Role.name,
    _id: false,
  })
  roles?: Role[];

  @Prop({
    type: Types.ObjectId,
    ref: Unit.name,
    required: true,
    index: true,
  })
  unit: Unit;
}

export const UserSchema = SchemaFactory.createForClass(User);

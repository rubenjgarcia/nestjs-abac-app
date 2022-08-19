import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { isEmail } from 'class-validator';
import { Document, Types } from 'mongoose';

export type OrganizationDocument = Organization & Document;

@Schema()
export class Organization {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

export type UnitDocument = Unit & Document;

@Schema()
export class Unit {
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
    type: [Types.ObjectId],
    ref: Unit.name,
    _id: false,
  })
  ancestors?: Unit[];
}

export const UnitSchema = SchemaFactory.createForClass(Unit);

export type PolicyDocument = Policy & Document;

@Schema()
export class Policy {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  effect: string;

  @Prop({ required: true })
  actions: string[];

  @Prop({ required: true })
  resources: string[];

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

export type UserDocument = User & Document;

@Schema()
export class User {
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
    type: Types.ObjectId,
    ref: Unit.name,
    required: true,
    index: true,
  })
  unit: Unit;
}

export const UserSchema = SchemaFactory.createForClass(User);

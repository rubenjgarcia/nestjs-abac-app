import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WithPolicies } from '../../framework/factories/casl-ability.factory';
import { Entity } from '../../framework/entity';
import { Unit } from '../units/units.schema';
import { Policy } from '../policies/policies.schema';

export type RoleDocument = Role & Document;

@Schema()
export class Role implements WithPolicies, Entity {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

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

export const RoleSchema = SchemaFactory.createForClass(Role);

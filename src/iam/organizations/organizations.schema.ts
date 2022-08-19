import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrganizationDocument = Organization & Document;

@Schema()
export class Organization {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

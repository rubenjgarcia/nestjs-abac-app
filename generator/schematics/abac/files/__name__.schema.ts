import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type <%= singular(classify(name)) %>Document = <%= singular(classify(name)) %> & Document;

@Schema()
export class <%= singular(classify(name)) %> {
  _id: Types.ObjectId;
}

export const <%= singular(classify(name)) %>Schema = SchemaFactory.createForClass(<%= singular(classify(name)) %>);

import { Injectable } from '@nestjs/common';
import { <%= singular(classify(name)) %>, <%= singular(classify(name)) %>Document } from './<%= name %>.schema';
import { <%= singular(classify(name)) %>CrudActions } from './<%= name %>.actions';
import { AccessibleRecordModel } from '@casl/mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CrudService } from '../framework/crud.service';

@Injectable()
export class <%= singular(classify(name)) %>Service extends CrudService<<%= singular(classify(name)) %>Document> {
  constructor(
    @InjectModel(<%= singular(classify(name)) %>.name)
    model: AccessibleRecordModel<<%= singular(classify(name)) %>Document>,
  ) {
    super(model, new <%= singular(classify(name)) %>CrudActions());
  }
}

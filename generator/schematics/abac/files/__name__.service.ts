import { Injectable } from '@nestjs/common';
import { AccessibleRecordModel } from '@casl/mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { <%= singular(classify(name)) %>, <%= singular(classify(name)) %>Document } from './<%= name %>.schema';
import { <%= singular(classify(name)) %>ResponseDto } from './dtos/<%= singular(name) %>-response.dto';
import { <%= singular(classify(name)) %>CrudActions } from './<%= name %>.actions';
import { CrudService } from '../framework/crud.service';

@Injectable()
export class <%= singular(classify(name)) %>Service extends CrudService<<%= singular(classify(name)) %>Document, <%= singular(classify(name)) %>ResponseDto> {
  constructor(
    @InjectModel(<%= singular(classify(name)) %>.name)
    model: AccessibleRecordModel<<%= singular(classify(name)) %>Document>,
  ) {
    super(model, new <%= singular(classify(name)) %>CrudActions());
  }
}

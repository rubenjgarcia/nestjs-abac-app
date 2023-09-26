import {
  AutomapperProfile,
  InjectMapper,
} from '@timonmasberg/automapper-nestjs';
import { createMap, type Mapper } from '@automapper/core';
import { Injectable } from '@nestjs/common';
import { <%= singular(classify(name)) %> } from './<%= name %>.schema';
import { <%= singular(classify(name)) %>ResponseDto } from './dtos/<%= singular(name) %>-response.dto';

@Injectable()
export class <%= singular(classify(name)) %>Profile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) {
    super(mapper);
  }

  override get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, <%= singular(classify(name)) %>, <%= singular(classify(name)) %>ResponseDto);
    };
  }
}

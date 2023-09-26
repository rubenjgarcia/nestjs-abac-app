import {
  AutomapperProfile,
  InjectMapper,
} from '@timonmasberg/automapper-nestjs';
import { createMap, type Mapper } from '@automapper/core';
import { Injectable } from '@nestjs/common';
import { Group } from './groups.schema';
import { GroupResponseDto } from './dtos/group-response.dto';

@Injectable()
export class GroupProfile extends AutomapperProfile {
  constructor(@InjectMapper() mapper: Mapper) {
    super(mapper);
  }

  override get profile() {
    return (mapper: Mapper) => {
      createMap(mapper, Group, GroupResponseDto);
    };
  }
}

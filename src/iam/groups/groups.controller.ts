import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { GroupService } from './groups.service';
import { Group } from './groups.schema';
import { CreateGroupDto } from './dtos/create-group.dto';
import { UpdateGroupDto } from './dtos/update-group.dto';
import {
  GetGroupPolicyHandler,
  CreateGroupPolicyHandler,
  ListGroupsPolicyHandler,
  UpdateGroupPolicyHandler,
  RemoveGroupPolicyHandler,
} from './groups.handler';
import { CheckPolicies } from '../../framework/decorators/check-policies.decorator';

@Controller(['iam/groups'])
export class GroupController {
  private readonly logger = new Logger(GroupController.name);

  constructor(private readonly groupService: GroupService) {}

  @Post()
  @CheckPolicies(new CreateGroupPolicyHandler())
  async create(
    @Body() createGroupDto: CreateGroupDto,
    @Req() request: Request,
  ): Promise<Group> {
    return await this.groupService.create(createGroupDto, request.user);
  }

  @Get()
  @CheckPolicies(new ListGroupsPolicyHandler())
  async findAll(@Req() request: Request): Promise<Group[]> {
    return this.groupService.findAll(request.user);
  }

  @Get(':id')
  @CheckPolicies(new GetGroupPolicyHandler('id'))
  async findOne(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<Group> {
    return this.groupService.findOne(id, request.user);
  }

  @Put(':id')
  @CheckPolicies(new UpdateGroupPolicyHandler('id'))
  async update(
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @Req() request: Request,
  ): Promise<Group> {
    return this.groupService.update(id, updateGroupDto, request.user);
  }

  @Delete(':id')
  @CheckPolicies(new RemoveGroupPolicyHandler('id'))
  remove(@Param('id') id: string, @Req() request: Request) {
    return this.groupService.remove(id, request.user);
  }
}

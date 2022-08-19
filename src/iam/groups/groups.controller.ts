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
    @Req() request: any,
  ): Promise<Group> {
    return await this.groupService.create(
      createGroupDto,
      request.user,
      request.user.unitId,
    );
  }

  @Get()
  @CheckPolicies(new ListGroupsPolicyHandler())
  async findAll(@Req() request: any): Promise<Group[]> {
    return this.groupService.findAll(request.user, request.user.unitId);
  }

  @Get(':id')
  @CheckPolicies(new GetGroupPolicyHandler('id'))
  async findOne(@Param('id') id: string, @Req() request: any): Promise<Group> {
    return this.groupService.findOne(id, request.user, request.user.unitId);
  }

  @Put(':id')
  @CheckPolicies(new UpdateGroupPolicyHandler('id'))
  async update(
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @Req() request: any,
  ): Promise<Group> {
    return this.groupService.update(
      id,
      updateGroupDto,
      request.user,
      request.user.unitId,
    );
  }

  @Delete(':id')
  @CheckPolicies(new RemoveGroupPolicyHandler('id'))
  remove(@Param('id') id: string, @Req() request: any) {
    return this.groupService.remove(id, request.user, request.user.unitId);
  }
}

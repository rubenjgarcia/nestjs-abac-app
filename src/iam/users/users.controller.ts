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
import { UserService } from './users.service';
import { User } from './users.schema';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { CheckPolicies } from '../../framework/decorators/check-policies.decorator';
import {
  GetUserPolicyHandler,
  ListUsersPolicyHandler,
  CreateUsersPolicyHandler,
  RemoveUserPolicyHandler,
  UpdateUserPolicyHandler,
  AddGroupToUserPolicyHandler,
} from './users.handler';

@Controller(['iam/users'])
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Post()
  @CheckPolicies(new CreateUsersPolicyHandler())
  async create(
    @Body() createUserDto: CreateUserDto,
    @Req() request: any,
  ): Promise<User> {
    return await this.userService.create(
      createUserDto,
      request.user,
      request.user.unitId,
    );
  }

  @Get()
  @CheckPolicies(new ListUsersPolicyHandler())
  async findAll(@Req() request: any): Promise<User[]> {
    return this.userService.findAll(request.user, request.user.unitId);
  }

  @Get(':id')
  @CheckPolicies(new GetUserPolicyHandler('id'))
  async findOne(@Param('id') id: string, @Req() request: any): Promise<User> {
    return this.userService.findOne(id, request.user, request.user.unitId);
  }

  @Put(':id')
  @CheckPolicies(new UpdateUserPolicyHandler('id'))
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: any,
  ): Promise<User> {
    return this.userService.update(
      id,
      updateUserDto,
      request.user,
      request.user.unitId,
    );
  }

  @Delete(':id')
  @CheckPolicies(new RemoveUserPolicyHandler('id'))
  remove(@Param('id') id: string, @Req() request: any) {
    return this.userService.remove(id, request.user, request.user.unitId);
  }

  @Post(':id/group/:groupId')
  @CheckPolicies(new AddGroupToUserPolicyHandler('id'))
  async addGroupToUser(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Req() request: any,
  ): Promise<User> {
    return await this.userService.addGroupToUser(
      id,
      groupId,
      request.user,
      request.user.unitId,
    );
  }
}

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
    @Req() request: Request,
  ): Promise<User> {
    return await this.userService.create(createUserDto, request.user);
  }

  @Get()
  @CheckPolicies(new ListUsersPolicyHandler())
  async findAll(@Req() request: Request): Promise<User[]> {
    return this.userService.findAll(request.user);
  }

  @Get(':id')
  @CheckPolicies(new GetUserPolicyHandler('id'))
  async findOne(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<User> {
    return this.userService.findOne(id, request.user);
  }

  @Put(':id')
  @CheckPolicies(new UpdateUserPolicyHandler('id'))
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: Request,
  ): Promise<User> {
    return this.userService.update(id, updateUserDto, request.user);
  }

  @Delete(':id')
  @CheckPolicies(new RemoveUserPolicyHandler('id'))
  remove(@Param('id') id: string, @Req() request: Request) {
    return this.userService.remove(id, request.user);
  }

  @Post(':id/group/:groupId')
  @CheckPolicies(new AddGroupToUserPolicyHandler('id'))
  async addGroupToUser(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Req() request: Request,
  ): Promise<User> {
    return await this.userService.addGroupToUser(id, groupId, request.user);
  }
}

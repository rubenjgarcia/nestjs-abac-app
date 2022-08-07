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
import { UserService } from '../services/user.service';
import { User } from '../schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from '../dtos/users';
import { CheckPolicies } from '../decorators/check-policies.decorator';
import {
  GetUserPolicyHandler,
  ListUsersPolicyHandler,
  CreateUsersPolicyHandler,
  RemoveUserPolicyHandler,
  UpdateUserPolicyHandler,
} from '../handlers/user.handler';

@Controller(['auth/users'])
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
}

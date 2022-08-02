import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { User } from '../schemas/user.schema';
import { CreateUserDto } from '../dtos/users';
import { CheckPolicies } from '../decorators/check-policies.decorator';
import {
  GetUserPolicyHandler,
  ListUsersPolicyHandler,
  CreateUsersPolicyHandler,
} from '../handlers/user.handler';

@Controller(['auth/users'])
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Post()
  @CheckPolicies(new CreateUsersPolicyHandler())
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return await this.userService.create(createUserDto);
  }

  @Get()
  @CheckPolicies(new ListUsersPolicyHandler())
  async findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  @CheckPolicies(new GetUserPolicyHandler('id'))
  async findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }
}

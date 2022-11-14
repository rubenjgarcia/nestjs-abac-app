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
  Res,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { toFileStream } from 'qrcode';
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
  Activate2FAPolicyHandler,
} from './users.handler';
import { Validate2FADto } from './dtos/validate-2fa';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../framework/guards/policies.guard';

@Controller(['iam/users'])
@UseGuards(JwtAuthGuard, PoliciesGuard)
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

  @Post('/2FA/generate')
  @HttpCode(200)
  @CheckPolicies(new Activate2FAPolicyHandler())
  async generate2FA(
    @Req() request: any,
    @Res() response: Response,
  ): Promise<void> {
    const otpauthUrl = await this.userService.generate2FA(
      request.user.userId,
      request.user,
      request.user.unitId,
    );
    return toFileStream(response, otpauthUrl);
  }

  @Post('/2FA/validate')
  @HttpCode(200)
  @CheckPolicies(new Activate2FAPolicyHandler())
  async validate2FA(
    @Body() validate2FADto: Validate2FADto,
    @Req() request: any,
  ): Promise<void> {
    await this.userService.validate2FA(
      request.user.userId,
      request.user,
      request.user.unitId,
      validate2FADto.token,
    );
  }
}

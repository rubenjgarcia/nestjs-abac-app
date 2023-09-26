import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './roles.service';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import {
  GetRolePolicyHandler,
  CreateRolePolicyHandler,
  ListRolesPolicyHandler,
  UpdateRolePolicyHandler,
  RemoveRolePolicyHandler,
  AddRoleToUserPolicyHandler,
  RemoveRoleFromUserPolicyHandler,
} from './roles.handler';
import { CheckPolicies } from '../../framework/decorators/check-policies.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../framework/guards/policies.guard';
import { RoleResponseDto } from './dtos/role-response.dto';

@Controller(['iam/roles'])
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class RoleController {
  private readonly logger = new Logger(RoleController.name);

  constructor(private readonly roleService: RoleService) {}

  @Post()
  @CheckPolicies(new CreateRolePolicyHandler())
  async create(
    @Body() createRoleDto: CreateRoleDto,
    @Req() request: any,
  ): Promise<RoleResponseDto> {
    return await this.roleService.create(
      createRoleDto,
      request.user,
      request.user.unitId,
    );
  }

  @Get()
  @CheckPolicies(new ListRolesPolicyHandler())
  async findAll(@Req() request: any): Promise<RoleResponseDto[]> {
    return this.roleService.findAll(request.user, request.user.unitId);
  }

  @Get(':id')
  @CheckPolicies(new GetRolePolicyHandler('id'))
  async findOne(
    @Param('id') id: string,
    @Req() request: any,
  ): Promise<RoleResponseDto> {
    return this.roleService.findOne(id, request.user, request.user.unitId);
  }

  @Put(':id')
  @CheckPolicies(new UpdateRolePolicyHandler('id'))
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Req() request: any,
  ): Promise<RoleResponseDto> {
    return this.roleService.update(
      id,
      updateRoleDto,
      request.user,
      request.user.unitId,
    );
  }

  @Delete(':id')
  @CheckPolicies(new RemoveRolePolicyHandler('id'))
  remove(@Param('id') id: string, @Req() request: any) {
    return this.roleService.remove(id, request.user, request.user.unitId);
  }

  @Post(':roleId/addToUser/:userId')
  @HttpCode(200)
  @CheckPolicies(new AddRoleToUserPolicyHandler('roleId'))
  async addRoleToUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
    @Req() request: any,
  ): Promise<void> {
    return this.roleService.addRoleToUser(
      roleId,
      userId,
      request.user,
      request.user.unitId,
    );
  }

  @Delete(':roleId/removeFromUser/:userId')
  @CheckPolicies(new RemoveRoleFromUserPolicyHandler('roleId'))
  async removeRoleFromUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
    @Req() request: any,
  ): Promise<void> {
    return this.roleService.removeRoleFromUser(
      roleId,
      userId,
      request.user,
      request.user.unitId,
    );
  }
}

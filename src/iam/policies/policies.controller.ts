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
  UseGuards,
} from '@nestjs/common';
import { PolicyService } from './policies.service';
import { CreatePolicyDto } from './dtos/create-policy.dto';
import { UpdatePolicyDto } from './dtos/update-policy.dto';
import {
  GetPolicyPolicyHandler,
  CreatePolicyPolicyHandler,
  ListPoliciesPolicyHandler,
  UpdatePolicyPolicyHandler,
  RemovePolicyPolicyHandler,
} from './policies.handler';
import { CheckPolicies } from '../../framework/decorators/check-policies.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../framework/guards/policies.guard';
import { PolicyResponseDto } from './dtos/policy-response.dto';

@Controller(['iam/policies'])
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class PolicyController {
  private readonly logger = new Logger(PolicyController.name);

  constructor(private readonly policyService: PolicyService) {}

  @Post()
  @CheckPolicies(new CreatePolicyPolicyHandler())
  async create(
    @Body() createPolicyDto: CreatePolicyDto,
    @Req() request: any,
  ): Promise<PolicyResponseDto> {
    return await this.policyService.create(
      createPolicyDto,
      request.user,
      request.user.unitId,
    );
  }

  @Get()
  @CheckPolicies(new ListPoliciesPolicyHandler())
  async findAll(@Req() request: any): Promise<PolicyResponseDto[]> {
    return this.policyService.findAll(request.user, request.user.unitId);
  }

  @Get(':id')
  @CheckPolicies(new GetPolicyPolicyHandler('id'))
  async findOne(
    @Param('id') id: string,
    @Req() request: any,
  ): Promise<PolicyResponseDto> {
    return this.policyService.findOne(id, request.user, request.user.unitId);
  }

  @Put(':id')
  @CheckPolicies(new UpdatePolicyPolicyHandler('id'))
  async update(
    @Param('id') id: string,
    @Body() updatePolicyDto: UpdatePolicyDto,
    @Req() request: any,
  ): Promise<PolicyResponseDto> {
    return this.policyService.update(
      id,
      updatePolicyDto,
      request.user,
      request.user.unitId,
    );
  }

  @Delete(':id')
  @CheckPolicies(new RemovePolicyPolicyHandler('id'))
  remove(@Param('id') id: string, @Req() request: any) {
    return this.policyService.remove(id, request.user, request.user.unitId);
  }
}

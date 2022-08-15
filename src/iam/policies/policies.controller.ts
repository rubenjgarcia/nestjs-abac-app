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
import { PolicyService } from './policies.service';
import { Policy } from './policies.schema';
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

@Controller(['iam/policies'])
export class PolicyController {
  private readonly logger = new Logger(PolicyController.name);

  constructor(private readonly policyService: PolicyService) {}

  @Post()
  @CheckPolicies(new CreatePolicyPolicyHandler())
  async create(
    @Body() createPolicyDto: CreatePolicyDto,
    @Req() request: Request,
  ): Promise<Policy> {
    return await this.policyService.create(createPolicyDto, request.user);
  }

  @Get()
  @CheckPolicies(new ListPoliciesPolicyHandler())
  async findAll(@Req() request: Request): Promise<Policy[]> {
    return this.policyService.findAll(request.user);
  }

  @Get(':id')
  @CheckPolicies(new GetPolicyPolicyHandler('id'))
  async findOne(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<Policy> {
    return this.policyService.findOne(id, request.user);
  }

  @Put(':id')
  @CheckPolicies(new UpdatePolicyPolicyHandler('id'))
  async update(
    @Param('id') id: string,
    @Body() updatePolicyDto: UpdatePolicyDto,
    @Req() request: Request,
  ): Promise<Policy> {
    return this.policyService.update(id, updatePolicyDto, request.user);
  }

  @Delete(':id')
  @CheckPolicies(new RemovePolicyPolicyHandler('id'))
  remove(@Param('id') id: string, @Req() request: Request) {
    return this.policyService.remove(id, request.user);
  }
}

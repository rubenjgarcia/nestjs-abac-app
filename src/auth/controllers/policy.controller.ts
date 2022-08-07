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
import { PolicyService } from '../services/policy.service';
import { Policy } from '../schemas/policy.schema';
import { CreatePolicyDto, UpdatePolicyDto } from '../dtos/policies';
import {
  GetPolicyPolicyHandler,
  CreatePolicysPolicyHandler,
  ListPolicysPolicyHandler,
  UpdatePolicyPolicyHandler,
  RemovePolicyPolicyHandler,
} from '../handlers/policy.handler';
import { CheckPolicies } from '../decorators/check-policies.decorator';

@Controller(['auth/policies'])
export class PolicyController {
  private readonly logger = new Logger(PolicyController.name);

  constructor(private readonly policyService: PolicyService) {}

  @Post()
  @CheckPolicies(new CreatePolicysPolicyHandler())
  async create(
    @Body() createPolicyDto: CreatePolicyDto,
    @Req() request: Request,
  ): Promise<Policy> {
    return await this.policyService.create(createPolicyDto, request.user);
  }

  @Get()
  @CheckPolicies(new ListPolicysPolicyHandler())
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

import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
} from '@nestjs/common';
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
  async create(@Body() createPolicyDto: CreatePolicyDto): Promise<Policy> {
    return await this.policyService.create(createPolicyDto);
  }

  @Get()
  @CheckPolicies(new ListPolicysPolicyHandler())
  async findAll(): Promise<Policy[]> {
    return this.policyService.findAll();
  }

  @Get(':id')
  @CheckPolicies(new GetPolicyPolicyHandler('id'))
  async findOne(@Param('id') id: string): Promise<Policy> {
    return this.policyService.findOne(id);
  }

  @Put(':id')
  @CheckPolicies(new UpdatePolicyPolicyHandler('id'))
  async update(
    @Param('id') id: string,
    @Body() updatePolicyDto: UpdatePolicyDto,
  ): Promise<Policy> {
    return this.policyService.update(id, updatePolicyDto);
  }

  @Delete(':id')
  @CheckPolicies(new RemovePolicyPolicyHandler('id'))
  remove(@Param('id') id: string) {
    return this.policyService.remove(id);
  }
}

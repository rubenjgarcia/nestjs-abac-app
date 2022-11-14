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
import { Request } from 'express';
import { OrganizationService } from './organizations.service';
import { Organization } from './organizations.schema';
import { CreateOrganizationDto } from './dtos/create-organization.dto';
import { UpdateOrganizationDto } from './dtos/update-organization.dto';
import {
  GetOrganizationPolicyHandler,
  CreateOrganizationPolicyHandler,
  ListOrganizationsPolicyHandler,
  UpdateOrganizationPolicyHandler,
  RemoveOrganizationPolicyHandler,
} from './organizations.handler';
import { CheckPolicies } from '../../framework/decorators/check-policies.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../framework/guards/policies.guard';

@Controller(['iam/organizations'])
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class OrganizationController {
  private readonly logger = new Logger(OrganizationController.name);

  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @CheckPolicies(new CreateOrganizationPolicyHandler())
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Req() request: Request,
  ): Promise<Organization> {
    return await this.organizationService.create(
      createOrganizationDto,
      request.user,
    );
  }

  @Get()
  @CheckPolicies(new ListOrganizationsPolicyHandler())
  async findAll(@Req() request: Request): Promise<Organization[]> {
    return this.organizationService.findAll(request.user);
  }

  @Get(':id')
  @CheckPolicies(new GetOrganizationPolicyHandler('id'))
  async findOne(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<Organization> {
    return this.organizationService.findOne(id, request.user);
  }

  @Put(':id')
  @CheckPolicies(new UpdateOrganizationPolicyHandler('id'))
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @Req() request: Request,
  ): Promise<Organization> {
    return this.organizationService.update(
      id,
      updateOrganizationDto,
      request.user,
    );
  }

  @Delete(':id')
  @CheckPolicies(new RemoveOrganizationPolicyHandler('id'))
  remove(@Param('id') id: string, @Req() request: Request) {
    return this.organizationService.remove(id, request.user);
  }
}

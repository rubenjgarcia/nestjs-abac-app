import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UnitService } from './units.service';
import { Unit } from './units.schema';
import { CreateUnitDto } from './dtos/create-unit.dto';
import { UpdateUnitDto } from './dtos/update-unit.dto';
import {
  GetUnitPolicyHandler,
  CreateUnitPolicyHandler,
  ListUnitsPolicyHandler,
  UpdateUnitPolicyHandler,
  CreateChildUnitPolicyHandler,
} from './units.handler';
import { CheckPolicies } from '../../framework/decorators/check-policies.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../framework/guards/policies.guard';

@Controller(['iam/units'])
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class UnitController {
  private readonly logger = new Logger(UnitController.name);

  constructor(private readonly unitService: UnitService) {}

  @Post()
  @CheckPolicies(new CreateUnitPolicyHandler())
  async create(
    @Body() createUnitDto: CreateUnitDto,
    @Req() request: any,
  ): Promise<Unit> {
    return await this.unitService.create(
      createUnitDto,
      request.user,
      request.user.organizationId,
    );
  }

  @Get()
  @CheckPolicies(new ListUnitsPolicyHandler())
  async findAll(@Req() request: Request): Promise<Unit[]> {
    return this.unitService.findAll(request.user);
  }

  @Get(':id')
  @CheckPolicies(new GetUnitPolicyHandler('id'))
  async findOne(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<Unit> {
    return this.unitService.findOne(id, request.user);
  }

  @Put(':id')
  @CheckPolicies(new UpdateUnitPolicyHandler('id'))
  async update(
    @Param('id') id: string,
    @Body() updateUnitDto: UpdateUnitDto,
    @Req() request: Request,
  ): Promise<Unit> {
    return this.unitService.update(id, updateUnitDto, request.user);
  }

  @Post('/child')
  @CheckPolicies(new CreateChildUnitPolicyHandler())
  async createChildUnit(
    @Body() createUnitDto: CreateUnitDto,
    @Req() request: any,
  ): Promise<Unit> {
    return await this.unitService.create(
      createUnitDto,
      request.user,
      request.user.organizationId,
      request.user.unitId,
    );
  }
}

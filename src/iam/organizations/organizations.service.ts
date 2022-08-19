import { Injectable } from '@nestjs/common';
import { AccessibleRecordModel } from '@casl/mongoose';
import { ForbiddenError, subject } from '@casl/ability';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Organization, OrganizationDocument } from './organizations.schema';
import {
  CaslAbilityFactory,
  WithPolicies,
} from '../../framework/factories/casl-ability.factory';
import {
  CreateOrganization,
  GetOrganization,
  ListOrganizations,
  RemoveOrganization,
  UpdateOrganization,
  OrganizationScope,
} from './organizations.actions';
import { CreateOrganizationDto } from './dtos/create-organization.dto';
import { UpdateOrganizationDto } from './dtos/update-organization.dto';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectModel(Organization.name)
    readonly model: AccessibleRecordModel<OrganizationDocument>,
    readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async create(
    createDto: CreateOrganizationDto,
    withPolicies: WithPolicies,
  ): Promise<Organization> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    ForbiddenError.from(ability).throwUnlessCan(
      CreateOrganization,
      subject(OrganizationScope, {
        ...createDto,
      }),
    );
    return await this.model.create(createDto);
  }

  async findAll(
    withPolicies: WithPolicies,
    select?: string | any,
  ): Promise<Organization[]> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return this.model
      .find()
      .accessibleBy(ability, ListOrganizations)
      .select(select);
  }

  async findOne(
    id: string,
    withPolicies: WithPolicies,
    select?: string | any,
  ): Promise<Organization> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return await this.model
      .accessibleBy(ability, GetOrganization)
      .findOne({
        _id: new Types.ObjectId(id),
      })
      .orFail()
      .select(select);
  }

  async update(
    id: string,
    updateDto: UpdateOrganizationDto,
    withPolicies: WithPolicies,
    select?: string | any,
  ): Promise<Organization> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return await this.model
      .accessibleBy(ability, UpdateOrganization)
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id) },
        { $set: updateDto },
        { new: true },
      )
      .orFail()
      .select(select);
  }

  async remove(id: string, withPolicies: WithPolicies): Promise<void> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    await this.model
      .accessibleBy(ability, RemoveOrganization)
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
      })
      .orFail();
  }
}

import { Injectable } from '@nestjs/common';
import { AccessibleRecordModel } from '@casl/mongoose';
import { ForbiddenError, subject } from '@casl/ability';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Unit, UnitDocument } from './units.schema';
import {
  CaslAbilityFactory,
  WithPolicies,
} from '../../framework/factories/casl-ability.factory';
import {
  CreateUnit,
  GetUnit,
  ListUnits,
  RemoveUnit,
  UpdateUnit,
  UnitScope,
  CreateChildUnit,
} from './units.actions';
import { CreateUnitDto } from './dtos/create-unit.dto';
import { UpdateUnitDto } from './dtos/update-unit.dto';

@Injectable()
export class UnitService {
  constructor(
    @InjectModel(Unit.name)
    readonly model: AccessibleRecordModel<UnitDocument>,
    readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async create(
    createDto: CreateUnitDto,
    withPolicies: WithPolicies,
    organizationId: string,
    parentUnitId?: string,
  ): Promise<Unit> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    ForbiddenError.from(ability).throwUnlessCan(
      parentUnitId ? CreateChildUnit : CreateUnit,
      subject(UnitScope, {
        ...createDto,
      }),
    );

    let ancestors;
    if (parentUnitId) {
      const parentUnit = await this.model.findById(
        new Types.ObjectId(parentUnitId),
      );
      ancestors = parentUnit.ancestors || [];
      ancestors.push(parentUnit._id);
    }

    return await this.model.create({
      ...createDto,
      ancestors,
      organization: new Types.ObjectId(organizationId),
      parent: parentUnitId ? new Types.ObjectId(parentUnitId) : null,
    });
  }

  async findAll(
    withPolicies: WithPolicies,
    select?: string | any,
  ): Promise<Unit[]> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return this.model.find().accessibleBy(ability, ListUnits).select(select);
  }

  async findOne(
    id: string,
    withPolicies: WithPolicies,
    select?: string | any,
  ): Promise<Unit> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return await this.model
      .accessibleBy(ability, GetUnit)
      .findOne({
        _id: new Types.ObjectId(id),
      })
      .orFail()
      .select(select);
  }

  async update(
    id: string,
    updateDto: UpdateUnitDto,
    withPolicies: WithPolicies,
    select?: string | any,
  ): Promise<Unit> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return await this.model
      .accessibleBy(ability, UpdateUnit)
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
      .accessibleBy(ability, RemoveUnit)
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
      })
      .orFail();
  }
}

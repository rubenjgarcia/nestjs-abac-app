import { ForbiddenError, subject } from '@casl/ability';
import { AccessibleRecordModel } from '@casl/mongoose';
import { Inject, Injectable } from '@nestjs/common';
import { Document, Types } from 'mongoose';
import {
  CaslAbilityFactory,
  WithPolicies,
} from './factories/casl-ability.factory';
import { CreateDto, ResponseDto, UpdateDto } from './dtos';
import { CrudActions } from './actions';
import { Entity } from './entity';
import { Mapper } from '@automapper/core';

@Injectable()
export abstract class CrudService<
  T extends Document & Entity,
  R extends ResponseDto,
> {
  @Inject()
  readonly caslAbilityFactory: CaslAbilityFactory;

  @Inject()
  readonly mapper: Mapper;

  constructor(
    readonly model: AccessibleRecordModel<T>,
    readonly crudActions: CrudActions,
  ) {}

  async create(
    createDto: CreateDto,
    withPolicies: WithPolicies,
    unitId: string,
  ): Promise<R> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    ForbiddenError.from(ability).throwUnlessCan(
      this.crudActions.createAction,
      subject(this.crudActions.scope, {
        ...createDto,
      }),
    );
    const response = await this.model.create({
      ...createDto,
      unit: new Types.ObjectId(unitId),
    });
    return this.mapper.map(response, ResponseDto) as R;
  }

  async findAll(
    withPolicies: WithPolicies,
    unitId: string,
    select?: string | any,
  ): Promise<R[]> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    const response = await this.model
      .find({ unit: new Types.ObjectId(unitId) })
      .accessibleBy(ability, this.crudActions.listAction)
      .select(select);
    return this.mapper.mapArray(response, ResponseDto) as R[];
  }

  async findOne(
    id: string,
    withPolicies: WithPolicies,
    unitId: string,
    select?: string | any,
  ): Promise<R> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    const response = await this.model
      .accessibleBy(ability, this.crudActions.getAction)
      .findOne({
        _id: new Types.ObjectId(id),
        unit: new Types.ObjectId(unitId),
      })
      .orFail()
      .select(select);
    return this.mapper.map(response, ResponseDto) as R;
  }

  async update(
    id: string,
    updateDto: UpdateDto,
    withPolicies: WithPolicies,
    unitId: string,
    select?: string | any,
  ): Promise<R> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    const response = await this.model
      .accessibleBy(ability, this.crudActions.updateAction)
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), unit: new Types.ObjectId(unitId) },
        { $set: updateDto },
        { new: true },
      )
      .orFail()
      .select(select);
    return this.mapper.map(response, ResponseDto) as R;
  }

  async remove(
    id: string,
    withPolicies: WithPolicies,
    unitId: string,
  ): Promise<void> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    await this.model
      .accessibleBy(ability, this.crudActions.removeAction)
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
        unit: new Types.ObjectId(unitId),
      })
      .orFail();
  }
}

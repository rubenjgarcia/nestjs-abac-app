import { ForbiddenError, subject } from '@casl/ability';
import { AccessibleRecordModel } from '@casl/mongoose';
import { Inject, Injectable } from '@nestjs/common';
import { Document, Types } from 'mongoose';
import {
  CaslAbilityFactory,
  WithPolicies,
} from './factories/casl-ability.factory';
import { CreateDto, UpdateDto } from './dtos';
import { CrudActions } from './actions';
import { Entity } from './entity';

@Injectable()
export abstract class CrudService<T extends Document & Entity> {
  @Inject()
  readonly caslAbilityFactory: CaslAbilityFactory;

  constructor(
    readonly model: AccessibleRecordModel<T>,
    readonly crudActions: CrudActions,
  ) {}

  async create(
    createDto: CreateDto,
    withPolicies: WithPolicies,
    unitId: string,
  ): Promise<T> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    ForbiddenError.from(ability).throwUnlessCan(
      this.crudActions.createAction,
      subject(this.crudActions.scope, {
        ...createDto,
      }),
    );
    return await this.model.create({
      ...createDto,
      unit: new Types.ObjectId(unitId),
    });
  }

  async findAll(
    withPolicies: WithPolicies,
    unitId: string,
    select?: string | any,
  ): Promise<T[]> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return this.model
      .find({ unit: new Types.ObjectId(unitId) })
      .accessibleBy(ability, this.crudActions.listAction)
      .select(select);
  }

  async findOne(
    id: string,
    withPolicies: WithPolicies,
    unitId: string,
    select?: string | any,
  ): Promise<T> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return await this.model
      .accessibleBy(ability, this.crudActions.getAction)
      .findOne({
        _id: new Types.ObjectId(id),
        unit: new Types.ObjectId(unitId),
      })
      .orFail()
      .select(select);
  }

  async update(
    id: string,
    updateDto: UpdateDto,
    withPolicies: WithPolicies,
    unitId: string,
    select?: string | any,
  ): Promise<T> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return await this.model
      .accessibleBy(ability, this.crudActions.updateAction)
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), unit: new Types.ObjectId(unitId) },
        { $set: updateDto },
        { new: true },
      )
      .orFail()
      .select(select);
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

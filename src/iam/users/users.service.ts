import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AccessibleRecordModel } from '@casl/mongoose';
import { Types, Error } from 'mongoose';
import { User, UserDocument } from './users.schema';
import { WithPolicies } from '../../framework/factories/casl-ability.factory';
import { CrudService } from '../../framework/crud.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { AddGroupToUser, UserCrudActions } from './users.actions';
import { Group, GroupDocument } from '../groups/groups.schema';

@Injectable()
export class UserService extends CrudService<UserDocument> {
  constructor(
    @InjectModel(User.name)
    userModel: AccessibleRecordModel<UserDocument>,
    @InjectModel(Group.name)
    private readonly groupModel: AccessibleRecordModel<GroupDocument>,
  ) {
    super(userModel, new UserCrudActions());
  }

  async create(
    createUserDto: CreateUserDto,
    withPolicies: WithPolicies,
    unitId: string,
  ): Promise<UserDocument> {
    const hash = await bcrypt.hash(createUserDto.password, 10);
    const userResponse = await super.create(
      {
        ...createUserDto,
        password: hash,
        unit: { id: new Types.ObjectId(unitId) },
      },
      withPolicies,
      unitId,
    );
    userResponse.password = undefined;
    userResponse.policies = undefined;
    return userResponse;
  }

  async findAll(
    withPolicies: WithPolicies,
    unitId: string,
  ): Promise<UserDocument[]> {
    return await super.findAll(withPolicies, unitId, {
      password: false,
      policies: false,
      groups: false,
      roles: false,
    });
  }

  async findOne(
    id: string,
    withPolicies: WithPolicies,
    unitId: string,
  ): Promise<UserDocument> {
    return await super.findOne(id, withPolicies, unitId, {
      password: false,
      policies: false,
      groups: false,
      roles: false,
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    withPolicies: WithPolicies,
    unitId: string,
  ): Promise<UserDocument> {
    return await super.update(id, updateUserDto, withPolicies, unitId, {
      password: false,
      policies: false,
      groups: false,
      roles: false,
    });
  }

  async findOneByEmailAndPassword(
    email: string,
    password: string,
  ): Promise<User> {
    const user = await this.model
      .findOne({ email })
      .select({ policies: false })
      .populate('unit');
    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);
      return passwordMatch ? { ...user.toObject(), password: null } : null;
    }

    return null;
  }

  async findOneWithPolicies(email: string): Promise<User> {
    return await this.model
      .findOne({ email })
      .select({ password: false })
      .populate([
        { path: 'policies' },
        { path: 'groups', populate: { path: 'policies' } },
        { path: 'roles', populate: ['policies', 'unit'] },
        { path: 'unit' },
      ]);
  }

  async addGroupToUser(
    id: string,
    groupId: string,
    withPolicies: WithPolicies,
    unitId: string,
  ): Promise<UserDocument> {
    const group = await this.groupModel
      .findOne({
        _id: new Types.ObjectId(groupId),
        unit: new Types.ObjectId(unitId),
      })
      .orFail(new Error.DocumentNotFoundError('Group not found'));
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    await this.model
      .accessibleBy(ability, AddGroupToUser)
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id) },
        { $addToSet: { groups: group } },
      )
      .orFail();
    return await this.model
      .findOne({ _id: new Types.ObjectId(id) })
      .populate('groups', { policies: false })
      .select({
        policies: false,
      });
  }
}

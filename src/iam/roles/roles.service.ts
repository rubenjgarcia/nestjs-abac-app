import { Injectable } from '@nestjs/common';
import { AccessibleRecordModel } from '@casl/mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Role, RoleDocument } from './roles.schema';
import {
  AddRoleToUser,
  RemoveRoleFromUser,
  RoleCrudActions,
} from './roles.actions';
import { CrudService } from '../../framework/crud.service';
import { WithPolicies } from '../../framework/factories/casl-ability.factory';
import { User, UserDocument } from '../users/users.schema';
import { RoleResponseDto } from './dtos/role-response.dto';

@Injectable()
export class RoleService extends CrudService<RoleDocument, RoleResponseDto> {
  constructor(
    @InjectModel(Role.name)
    model: AccessibleRecordModel<RoleDocument>,
    @InjectModel(User.name)
    private userModel: AccessibleRecordModel<UserDocument>,
  ) {
    super(model, new RoleCrudActions());
  }

  async addRoleToUser(
    roleId: string,
    userId: string,
    withPolicies: WithPolicies,
    unitId: string,
  ): Promise<void> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    const role = await this.model
      .accessibleBy(ability, AddRoleToUser)
      .findOne({
        _id: new Types.ObjectId(roleId),
        unit: new Types.ObjectId(unitId),
      })
      .orFail();
    await this.userModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(userId),
        },
        { $addToSet: { roles: role } },
      )
      .orFail();
  }

  async removeRoleFromUser(
    roleId: string,
    userId: string,
    withPolicies: WithPolicies,
    unitId: string,
  ): Promise<void> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    const role = await this.model
      .accessibleBy(ability, RemoveRoleFromUser)
      .findOne({
        _id: new Types.ObjectId(roleId),
        unit: new Types.ObjectId(unitId),
      })
      .orFail();
    await this.userModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(userId),
        },
        { $pull: { roles: role._id } },
      )
      .orFail();
  }
}

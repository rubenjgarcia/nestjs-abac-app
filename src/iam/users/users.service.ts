import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AccessibleRecordModel } from '@casl/mongoose';
import { User, UserDocument } from './users.schema';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { WithPolicies } from '../../framework/factories/casl-ability.factory';
import { UserCrudActions } from './users.actions';
import { CrudService } from '../../framework/crud.service';

@Injectable()
export class UserService extends CrudService<UserDocument> {
  constructor(
    @InjectModel(User.name)
    userModel: AccessibleRecordModel<UserDocument>,
  ) {
    super(userModel, new UserCrudActions());
  }

  async create(
    createUserDto: CreateUserDto,
    withPolicies: WithPolicies,
  ): Promise<UserDocument> {
    const hash = await bcrypt.hash(createUserDto.password, 10);
    const userResponse = await super.create(
      {
        ...createUserDto,
        password: hash,
      },
      withPolicies,
    );
    userResponse.password = undefined;
    userResponse.policies = undefined;
    return userResponse;
  }

  async findAll(withPolicies: WithPolicies): Promise<UserDocument[]> {
    return await super.findAll(withPolicies, {
      password: false,
      policies: false,
    });
  }

  async findOne(id: string, withPolicies: WithPolicies): Promise<UserDocument> {
    return await super.findOne(id, withPolicies, {
      password: false,
      policies: false,
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    withPolicies: WithPolicies,
  ): Promise<UserDocument> {
    return await super.update(id, updateUserDto, withPolicies, {
      password: false,
      policies: false,
    });
  }

  async findOneWithPassword(email: string): Promise<User> {
    return await this.model.findOne({ email }).select({ policies: false });
  }

  async findOneWithPolicies(email: string): Promise<User> {
    return await this.model
      .findOne({ email })
      .select({ password: false })
      .populate('policies');
  }
}

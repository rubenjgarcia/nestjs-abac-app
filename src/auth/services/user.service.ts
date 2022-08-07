import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AccessibleRecordModel } from '@casl/mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from '../dtos/users';
import {
  CaslAbilityFactory,
  WithPolicies,
} from '../factories/casl-ability.factory';
import {
  ListUsers,
  CreateUser,
  GetUser,
  RemoveUser,
  UpdateUser,
} from '../actions/user.actions';
import { ForbiddenError, subject } from '@casl/ability';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: AccessibleRecordModel<UserDocument>,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    withPolicies: WithPolicies,
  ): Promise<User> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    ForbiddenError.from(ability).throwUnlessCan(
      CreateUser,
      subject('User', createUserDto),
    );

    const hash = await bcrypt.hash(createUserDto.password, 10);
    const userResponse = await this.userModel.create({
      ...createUserDto,
      password: hash,
    });
    userResponse.password = undefined;
    userResponse.policies = undefined;
    return userResponse;
  }

  async findAll(withPolicies: WithPolicies): Promise<User[]> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return this.userModel
      .find()
      .accessibleBy(ability, ListUsers)
      .select({ password: false, policies: false })
      .exec();
  }

  async findOne(id: string, withPolicies: WithPolicies): Promise<User> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return await this.userModel
      .accessibleBy(ability, GetUser)
      .findOne({ _id: new Types.ObjectId(id) })
      .orFail()
      .select({ password: false, policies: false });
  }

  async findOneWithPassword(email: string): Promise<User> {
    return await this.userModel.findOne({ email }).select({ policies: false });
  }

  async findOneWithPolicies(email: string): Promise<User> {
    return await this.userModel
      .findOne({ email })
      .select({ password: false })
      .populate('policies');
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    withPolicies: WithPolicies,
  ): Promise<User> {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    return await this.userModel
      .accessibleBy(ability, UpdateUser)
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id) },
        { $set: { policies: updateUserDto.policies } },
        { new: true },
      )
      .orFail()
      .select({ password: false, policies: false });
  }

  async remove(id: string, withPolicies: WithPolicies) {
    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    await this.userModel
      .accessibleBy(ability, RemoveUser)
      .findOneAndDelete({ _id: new Types.ObjectId(id) })
      .orFail();
  }
}

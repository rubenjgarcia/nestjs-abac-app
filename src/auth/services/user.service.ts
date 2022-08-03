import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from '../dtos/users';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hash = await bcrypt.hash(createUserDto.password, 10);
    const userResponse = await this.userModel.create({
      ...createUserDto,
      password: hash,
    });
    userResponse.password = undefined;
    userResponse.policies = undefined;
    return userResponse;
  }

  async findAll(): Promise<User[]> {
    return this.userModel
      .find()
      .select({ password: false, policies: false })
      .exec();
  }

  async findOne(id: string): Promise<User> {
    return await this.userModel
      .findOne({ _id: new Types.ObjectId(id) })
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

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    await this.userModel
      .updateOne(
        { _id: new Types.ObjectId(id) },
        { $set: { policies: updateUserDto.policies } },
      )
      .exec();
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.userModel.findByIdAndRemove({ _id: id }).exec();
  }
}

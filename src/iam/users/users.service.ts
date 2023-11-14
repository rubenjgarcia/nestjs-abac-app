import * as bcrypt from 'bcrypt';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AccessibleRecordModel } from '@casl/mongoose';
import { Types, Error } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from './users.schema';
import { WithPolicies } from '../../framework/factories/casl-ability.factory';
import { CrudService } from '../../framework/crud.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { AddGroupToUser, Activate2FA, UserCrudActions } from './users.actions';
import { Group, GroupDocument } from '../groups/groups.schema';
import { TwoFAService } from '../auth/2fa.service';
import { EventsService } from 'src/framework/events/events';
import { UserCreatedEvent } from './user.events';

@Injectable()
export class UserService extends CrudService<UserDocument> {
  constructor(
    @InjectModel(User.name)
    userModel: AccessibleRecordModel<UserDocument>,
    @InjectModel(Group.name)
    private readonly groupModel: AccessibleRecordModel<GroupDocument>,
    private readonly config: ConfigService,
    private readonly twoFAService: TwoFAService,
    private readonly eventsService: EventsService,
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
    await this.eventsService.emit(new UserCreatedEvent(userResponse));
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
      twoFactorAuthenticationSecret: false,
    });
  }

  async findOne(
    id: string,
    withPolicies: WithPolicies,
    unitId: string,
  ): Promise<UserDocument> {
    return await super.findOne(id, withPolicies, unitId, {
      password: false,
      twoFactorAuthenticationSecret: false,
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
      twoFactorAuthenticationSecret: false,
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

  async findOneById(id: string): Promise<User> {
    return await this.model
      .findOne({ _id: new Types.ObjectId(id) })
      .populate('unit')
      .orFail();
  }

  async findOneWithPolicies(email: string): Promise<User> {
    return await this.model
      .findOne({ email })
      .select({ password: false, twoFactorAuthenticationSecret: false })
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

  async generate2FA(
    userId: string,
    withPolicies: WithPolicies,
    unitId: string,
  ): Promise<string> {
    const user = await this.model.findOne({ _id: new Types.ObjectId(userId) });
    const secret = this.twoFAService.generateSecret();

    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    await this.model
      .accessibleBy(ability, Activate2FA)
      .updateOne(
        { _id: new Types.ObjectId(userId), unit: new Types.ObjectId(unitId) },
        { $set: { twoFactorAuthenticationSecret: secret } },
      )
      .orFail();

    const otpauthUrl = this.twoFAService.generateUri(
      user.email,
      this.config.get<string>('APP_NAME'),
      secret,
    );

    return otpauthUrl;
  }

  async validate2FA(
    userId: string,
    withPolicies: WithPolicies,
    unitId: string,
    token: string,
  ): Promise<void> {
    const user = await this.model.findOne({ _id: new Types.ObjectId(userId) });
    if (!user.twoFactorAuthenticationSecret) {
      throw new NotFoundException();
    }

    const isValidToken = this.twoFAService.verifyToken(
      token,
      user.twoFactorAuthenticationSecret,
    );

    if (!isValidToken) {
      throw new BadRequestException();
    }

    const ability = this.caslAbilityFactory.createWithPolicies(withPolicies);
    await this.model
      .accessibleBy(ability, Activate2FA)
      .updateOne(
        { _id: new Types.ObjectId(userId), unit: new Types.ObjectId(unitId) },
        { $set: { isTwoFactorAuthenticationEnabled: true } },
      )
      .orFail();
  }

  async changePassword(
    email: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.model.findOne({ email });
    if (!user) {
      throw new BadRequestException('User does not exist');
    }

    if (user) {
      const passwordMatch = await bcrypt.compare(oldPassword, user.password);
      if (!passwordMatch) {
        throw new BadRequestException('Old password is wrong');
      }
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await this.model.findOneAndUpdate(
      { email },
      {
        password: hash,
      },
    );
  }

  async findOneByEmail(email: string): Promise<User> {
    const user = await this.model
      .findOne({ email })
      .select({ password: false });

    return user;
  }

  async updateRecoveryToken(email: string, token: string): Promise<void> {
    const recoveryTokenTime = await this.config.get<number>(
      'RECOVERY_TOKEN_TIME',
      60 * 60 * 24,
    );
    const recoveryTokenExpiredAt = new Date(
      new Date().getTime() + recoveryTokenTime * 1000,
    );
    await this.model
      .findOneAndUpdate(
        { email },
        {
          recoveryToken: token,
          recoveryTokenExpiredAt,
        },
      )
      .orFail();
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.model.findOne({ email, recoveryToken: token });
    if (
      !user ||
      !user.recoveryTokenExpiredAt ||
      user.recoveryTokenExpiredAt < new Date()
    ) {
      throw new BadRequestException('Invalid token');
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await this.model.findOneAndUpdate(
      { email },
      {
        password: hash,
        $unset: { recoveryToken: 1, recoveryTokenExpiredAt: 1 },
      },
    );
  }
}

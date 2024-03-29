import * as crypto from 'crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/users.service';
import { User } from '../users/users.schema';
import { Role } from '../roles/roles.schema';
import { TwoFAService } from './2fa.service';
import { RecoverPasswordDto } from './dtos/recover-password';
import { ResetPasswordDto } from './dtos/reset-password';
import { EventsService } from 'src/framework/events/events';
import { UserRecoverPasswordEvent } from '../users/user.events';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly twoFAService: TwoFAService,
    private readonly eventsService: EventsService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    return await this.usersService.findOneByEmailAndPassword(email, password);
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user._id,
      unit: user.unit._id.toString(),
      organization: user.unit.organization._id.toString(),
      roles: user.roles ? user.roles.map((r: Role) => r._id.toString()) : null,
      twoFactorAuthentication: user.isTwoFactorAuthenticationEnabled || false,
    };
    return {
      access_token: this.jwtService.sign(payload),
      isTwoFactorAuthenticationEnabled:
        user.isTwoFactorAuthenticationEnabled || false,
    };
  }

  async validate2FA(userId: string, token: string) {
    const user = await this.usersService.findOneById(userId);
    if (!user.isTwoFactorAuthenticationEnabled) {
      throw new NotFoundException();
    }

    const isValidToken = this.twoFAService.verifyToken(
      token,
      user.twoFactorAuthenticationSecret,
    );

    if (!isValidToken) {
      throw new UnauthorizedException();
    }

    const payload = {
      email: user.email,
      sub: user._id,
      unit: user.unit._id.toString(),
      organization: user.unit.organization._id.toString(),
      roles: user.roles ? user.roles.map((r: Role) => r._id.toString()) : null,
      twoFactorAuthentication: user.isTwoFactorAuthenticationEnabled || false,
      isSecondFactorAuthenticated: true,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async assume(user: any, roleId: string) {
    if (
      !user.roles ||
      user.roles.length === 0 ||
      !user.roles.includes(roleId)
    ) {
      throw new ForbiddenException("You can't assume that role");
    }

    const payload = {
      email: user.email,
      sub: user.userId,
      unit: user.unitId,
      organization: user.organizationId,
      roles: user.roles,
      roleId,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async changePassword(
    user: any,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    return await this.usersService.changePassword(
      user.email,
      oldPassword,
      newPassword,
    );
  }

  async recoverPassword(recoverPasswordDto: RecoverPasswordDto): Promise<void> {
    const user = await this.usersService.findOneByEmail(
      recoverPasswordDto.email,
    );

    if (!user) {
      return;
    }

    const token = crypto.randomUUID();
    await this.usersService.updateRecoveryToken(
      recoverPasswordDto.email,
      token,
    );

    await this.eventsService.emit(
      new UserRecoverPasswordEvent({ email: recoverPasswordDto.email, token }),
    );
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    await this.usersService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }
}

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../users/users.service';

@Injectable()
export class Jwt2FAStrategy extends PassportStrategy(Strategy, 'jwt-2FA') {
  constructor(
    private readonly userService: UserService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.userService.findOneById(payload.sub);
    if (
      user.isTwoFactorAuthenticationEnabled &&
      !payload.isSecondFactorAuthenticated
    ) {
      return { userId: payload.sub };
    }
  }
}

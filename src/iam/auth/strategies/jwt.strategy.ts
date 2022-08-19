import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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
    const user = await this.userService.findOneWithPolicies(payload.email);
    const userPolicies = user.policies || [];
    const groupPolicies =
      user.groups?.reduce(
        (prev, cur) => [...prev, ...(cur.policies || [])],
        [],
      ) || [];
    return {
      userId: payload.sub,
      email: payload.email,
      unitId: user.unit._id.toString(),
      organizationId: user.unit.organization._id.toString(),
      policies: [...userPolicies, ...groupPolicies],
    };
  }
}

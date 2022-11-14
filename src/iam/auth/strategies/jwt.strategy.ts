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
    let unitId;
    let organizationId;
    let policies;
    if (payload.roleId) {
      const role = user.roles.find((r) => r._id.toString() === payload.roleId);
      policies = role.policies;
      unitId = role.unit._id.toString();
      organizationId = role.unit.organization._id.toString();
    } else {
      const userPolicies = user.policies || [];
      const groupPolicies =
        user.groups?.reduce(
          (prev, cur) => [...prev, ...(cur.policies || [])],
          [],
        ) || [];
      policies = [...userPolicies, ...groupPolicies];
      unitId = user.unit._id.toString();
      organizationId = user.unit.organization._id.toString();
    }

    const response = {
      userId: payload.sub,
      email: payload.email,
      unitId,
      organizationId,
      roleId: payload.roleId || null,
      roles: payload.roles,
      policies,
    };

    if (
      !payload.twoFactorAuthentication ||
      payload.isSecondFactorAuthenticated
    ) {
      return response;
    }
  }
}

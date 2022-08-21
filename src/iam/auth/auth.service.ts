import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/users.service';
import { User } from '../users/users.schema';
import { Role } from '../roles/roles.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
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
}

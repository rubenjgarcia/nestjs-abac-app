import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/users.service';
import { User } from '../users/users.schema';

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
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}

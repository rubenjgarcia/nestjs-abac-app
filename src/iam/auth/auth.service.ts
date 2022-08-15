import * as bcrypt from 'bcrypt';
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
    const user = await this.usersService.findOneWithPassword(email);
    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);
      return passwordMatch ? user : null;
    }

    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}

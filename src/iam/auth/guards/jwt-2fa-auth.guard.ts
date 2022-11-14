import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export default class Jwt2FAGuard extends AuthGuard('jwt-2FA') {}

import {
  Controller,
  HttpCode,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../framework/decorators/public-route.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthService } from './auth.service';

@Controller(['auth'])
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @Post('login')
  async login(@Req() req: Request) {
    return this.authService.login(req.user);
  }
}

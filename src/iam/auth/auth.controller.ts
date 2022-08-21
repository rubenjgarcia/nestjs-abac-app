import {
  Controller,
  HttpCode,
  Logger,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
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
  async login(@Req() req: any) {
    return this.authService.login(req.user);
  }

  @HttpCode(200)
  @Post('assume/:roleId')
  async assume(@Param('roleId') roleId: string, @Req() req: any) {
    return this.authService.assume(req.user, roleId);
  }
}

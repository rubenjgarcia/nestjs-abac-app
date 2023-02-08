import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../framework/decorators/public-route.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthService } from './auth.service';
import { Validate2FADto } from './dtos/validate-2fa';
import Jwt2FAGuard from './guards/jwt-2fa-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangePasswordDto } from './dtos/change-password';

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

  @UseGuards(Jwt2FAGuard)
  @HttpCode(200)
  @Post('validate2FA')
  async validate2FA(@Body() validate2FADto: Validate2FADto, @Req() req: any) {
    return this.authService.validate2FA(req.user.userId, validate2FADto.token);
  }

  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Post('assume/:roleId')
  async assume(@Param('roleId') roleId: string, @Req() req: any) {
    return this.authService.assume(req.user, roleId);
  }

  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Put('password')
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: any,
  ) {
    return this.authService.changePassword(
      req.user,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }
}

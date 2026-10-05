import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Customers: mobile OTP. Rate limited per IP on top of the per-number limits in OtpService.
  @Post('send-otp')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto);
  }

  @Post('verify-otp')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  // Staff only: email + password. Customers are rejected here.
  @Post('login') login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh') refresh(@Body('refreshToken') refreshToken: string) {
    return this.auth.refresh(refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: { user: { id: string } }) {
    return this.auth.logout(req.user.id);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: { id: string } }) {
    return this.auth.me(req.user.id);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: { user: { id: string } }, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.id, dto);
  }
}

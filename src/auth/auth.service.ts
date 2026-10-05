import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { SignOptions } from 'jsonwebtoken';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp/otp.service';
import { JwtUser } from './strategies/jwt.strategy';

type AuthUserRecord = {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: JwtUser['role'];
  isActive: boolean;
  passwordHash?: string | null;
  refreshTokenHash?: string | null;
};

type SanitizedUser = {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: JwtUser['role'];
  isActive: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly otp: OtpService,
  ) {}

  sendOtp(dto: SendOtpDto) {
    return this.otp.send(dto.phone);
  }

  // Customers sign in (or sign up on first use) with a mobile OTP.
  async verifyOtp(dto: VerifyOtpDto) {
    const phone = await this.otp.verify(dto.phone, dto.otp);
    let user = await this.findCustomerByPhone(phone);

    if (user) {
      if (user.role !== 'CUSTOMER') throw new UnauthorizedException('Staff accounts sign in with email and password');
      if (!user.isActive) throw new UnauthorizedException('This account is disabled');
    } else {
      user = await this.prisma.user.create({
        data: {
          phone,
          firstName: dto.firstName?.trim() || null,
          lastName: dto.lastName?.trim() || null,
          role: 'CUSTOMER',
          isActive: true,
        },
      });
    }

    return this.issueTokens(user.id, user.email, user.role, user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Email + password is for staff only; customers sign in with mobile OTP.
    if (!user || !user.isActive || !user.passwordHash || user.role === 'CUSTOMER') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    return this.issueTokens(user.id, user.email, user.role, user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user?.isActive || !user.refreshTokenHash)
        throw new UnauthorizedException('Invalid refresh token');

      const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!valid) throw new UnauthorizedException('Invalid refresh token');

      return this.issueTokens(user.id, user.email, user.role, user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found');
    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.passwordHash) throw new BadRequestException('This account does not use a password');
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, refreshTokenHash: null },
    });
    return { success: true };
  }

  async createAdmin(dto: RegisterDto, role: Exclude<JwtUser['role'], 'CUSTOMER'>) {
    const email = dto.email.toLowerCase().trim();
    const phone = dto.phone?.trim() || null;
    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          phone,
          passwordHash,
          firstName: dto.firstName?.trim() || null,
          lastName: dto.lastName?.trim() || null,
          role,
          isActive: true,
        },
      });
      return this.sanitizeUser(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email or phone number already registered');
      }
      throw error;
    }
  }

  // Stored numbers may predate normalisation (e.g. "+91 98765 43210"), so match the common forms.
  private async findCustomerByPhone(phone: string) {
    const variants = [phone, `+91${phone}`, `91${phone}`, `0${phone}`];
    const matches = await this.prisma.user.findMany({
      where: { phone: { in: variants } },
      take: 2,
    });
    if (matches.length > 1) throw new ConflictException('Multiple accounts use this phone number. Please contact support.');
    return matches[0] ?? null;
  }

  private async issueTokens(userId: string, email: string | null, role: JwtUser['role'], user: AuthUserRecord) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m') as SignOptions['expiresIn'],
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '30d',
        ) as SignOptions['expiresIn'],
      },
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash } });

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  private sanitizeUser(user: AuthUserRecord): SanitizedUser {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
    };
  }
}

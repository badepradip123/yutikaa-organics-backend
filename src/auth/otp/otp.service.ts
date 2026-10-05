import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Fast2smsService } from './fast2sms.service';
import { normalizeIndianMobile } from './phone.util';

export const OTP_RESEND_SECONDS = 30;
export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS_PER_HOUR = 5;

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: Fast2smsService,
  ) {}

  normalizePhone(value: string): string {
    const mobile = normalizeIndianMobile(value);
    if (!mobile) throw new BadRequestException('Enter a valid 10-digit Indian mobile number.');
    return mobile;
  }

  async send(rawPhone: string) {
    const phone = this.normalizePhone(rawPhone);
    const now = new Date();

    const latest = await this.prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (latest) {
      const waitSeconds =
        OTP_RESEND_SECONDS - Math.floor((now.getTime() - latest.createdAt.getTime()) / 1000);
      if (waitSeconds > 0) {
        throw new HttpException(
          { message: `Please wait ${waitSeconds}s before requesting another OTP.`, resendAfterSeconds: waitSeconds },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const sentLastHour = await this.prisma.otpCode.count({
      where: { phone, createdAt: { gte: new Date(now.getTime() - 60 * 60_000) } },
    });
    if (sentLastHour >= OTP_MAX_SENDS_PER_HOUR) {
      throw new HttpException('Too many OTP requests for this number. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = randomInt(100_000, 1_000_000).toString();
    const record = await this.prisma.otpCode.create({
      data: {
        phone,
        codeHash: await bcrypt.hash(code, 10),
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      },
      select: { id: true },
    });

    try {
      await this.sms.sendOtp(phone, code);
    } catch (error) {
      // The code was never delivered, so it must not be usable.
      await this.prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
      throw error;
    }

    return { success: true, resendAfterSeconds: OTP_RESEND_SECONDS };
  }

  // Returns the normalised phone when the code is correct, and consumes the code.
  async verify(rawPhone: string, code: string): Promise<string> {
    const phone = this.normalizePhone(rawPhone);
    const now = new Date();

    const record = await this.prisma.otpCode.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || record.expiresAt <= now) {
      throw new UnauthorizedException('This OTP has expired. Request a new one.');
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Too many incorrect attempts. Request a new OTP.');
    }

    const matches = await bcrypt.compare(code, record.codeHash);
    if (!matches) {
      await this.prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('Incorrect OTP.');
    }

    // Conditional update so two concurrent requests cannot both use the same code.
    const consumed = await this.prisma.otpCode.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count === 0) throw new UnauthorizedException('This OTP has already been used. Request a new one.');

    return phone;
  }
}

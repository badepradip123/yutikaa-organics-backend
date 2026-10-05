import { BadRequestException, HttpException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { OtpService, OTP_MAX_ATTEMPTS, OTP_RESEND_SECONDS } from './otp.service';
import { normalizeIndianMobile } from './phone.util';

type Row = {
  id: string;
  phone: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

function createHarness() {
  const rows: Row[] = [];
  const prisma = {
    otpCode: {
      findFirst: jest.fn(async ({ where }: { where: Partial<Row> }) => {
        const matches = rows.filter(
          (r) =>
            (where.phone === undefined || r.phone === where.phone) &&
            (where.consumedAt === undefined || r.consumedAt === where.consumedAt),
        );
        return matches.length ? matches[matches.length - 1] : null;
      }),
      count: jest.fn(async ({ where }: { where: { phone: string; createdAt: { gte: Date } } }) =>
        rows.filter((r) => r.phone === where.phone && r.createdAt >= where.createdAt.gte).length,
      ),
      create: jest.fn(async ({ data }: { data: Omit<Row, 'id' | 'attempts' | 'consumedAt' | 'createdAt'> }) => {
        const row: Row = {
          id: `otp-${rows.length + 1}`,
          attempts: 0,
          consumedAt: null,
          createdAt: new Date(),
          ...data,
        };
        rows.push(row);
        return { id: row.id };
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: { attempts?: { increment: number }; consumedAt?: Date } }) => {
        const row = rows.find((r) => r.id === where.id)!;
        if (data.attempts) row.attempts += data.attempts.increment;
        if (data.consumedAt) row.consumedAt = data.consumedAt;
        return row;
      }),
      updateMany: jest.fn(async ({ where, data }: { where: { id: string; consumedAt: null }; data: { consumedAt: Date } }) => {
        const row = rows.find((r) => r.id === where.id && r.consumedAt === null);
        if (!row) return { count: 0 };
        row.consumedAt = data.consumedAt;
        return { count: 1 };
      }),
    },
  };
  const sms = { sendOtp: jest.fn(async () => undefined) };
  const service = new OtpService(prisma as never, sms as never);
  return { service, rows, sms };
}

describe('normalizeIndianMobile', () => {
  it.each([
    ['98765 43210', '9876543210'],
    ['+91 98765 43210', '9876543210'],
    ['919876543210', '9876543210'],
    ['09876543210', '9876543210'],
  ])('accepts %s', (input, expected) => {
    expect(normalizeIndianMobile(input)).toBe(expected);
  });

  it.each(['12345 67890', '987654321', '+91 12345', 'abc'])('rejects %s', (input) => {
    expect(normalizeIndianMobile(input)).toBeNull();
  });
});

describe('OtpService', () => {
  it('rejects an invalid phone number before touching storage', async () => {
    const { service, rows, sms } = createHarness();
    await expect(service.send('12345')).rejects.toBeInstanceOf(BadRequestException);
    expect(rows).toHaveLength(0);
    expect(sms.sendOtp).not.toHaveBeenCalled();
  });

  it('sends a 6-digit code, stores only its hash, and returns no code', async () => {
    const { service, rows, sms } = createHarness();
    const result = await service.send('+91 98765 43210');

    expect(result).toEqual({ success: true, resendAfterSeconds: OTP_RESEND_SECONDS });
    const [phone, code] = sms.sendOtp.mock.calls[0] as unknown as [string, string];
    expect(phone).toBe('9876543210');
    expect(code).toMatch(/^\d{6}$/);
    expect(rows[0].codeHash).not.toContain(code);
    expect(await bcrypt.compare(code, rows[0].codeHash)).toBe(true);
  });

  it('enforces the resend cooldown', async () => {
    const { service } = createHarness();
    await service.send('9876543210');
    await expect(service.send('9876543210')).rejects.toBeInstanceOf(HttpException);
  });

  it('marks the code unusable when SMS delivery fails', async () => {
    const { service, rows, sms } = createHarness();
    sms.sendOtp.mockRejectedValueOnce(new Error('provider down'));
    await expect(service.send('9876543210')).rejects.toThrow('provider down');
    expect(rows[0].consumedAt).not.toBeNull();
  });

  it('accepts the correct code once and then refuses reuse', async () => {
    const { service, sms } = createHarness();
    await service.send('9876543210');
    const code = (sms.sendOtp.mock.calls[0] as unknown as [string, string])[1];

    await expect(service.verify('9876543210', code)).resolves.toBe('9876543210');
    await expect(service.verify('9876543210', code)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('counts wrong attempts and locks the code after the limit', async () => {
    const { service, rows, sms } = createHarness();
    await service.send('9876543210');
    const code = (sms.sendOtp.mock.calls[0] as unknown as [string, string])[1];
    const wrong = code === '000000' ? '111111' : '000000';

    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
      await expect(service.verify('9876543210', wrong)).rejects.toThrow('Incorrect OTP.');
    }
    expect(rows[0].attempts).toBe(OTP_MAX_ATTEMPTS);
    await expect(service.verify('9876543210', code)).rejects.toThrow('Too many incorrect attempts');
  });

  it('rejects an expired code', async () => {
    const { service, rows, sms } = createHarness();
    await service.send('9876543210');
    const code = (sms.sendOtp.mock.calls[0] as unknown as [string, string])[1];
    rows[0].expiresAt = new Date(Date.now() - 1000);
    await expect(service.verify('9876543210', code)).rejects.toThrow('expired');
  });
});

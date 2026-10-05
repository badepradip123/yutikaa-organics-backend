import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type Fast2smsResponse = { return?: boolean; message?: string | string[] };

// Thin wrapper around the Fast2SMS bulk API. The API key never leaves the backend.
@Injectable()
export class Fast2smsService {
  private readonly logger = new Logger(Fast2smsService.name);

  constructor(private readonly config: ConfigService) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const apiKey = this.config.get<string>('FAST2SMS_API_KEY');
    if (!apiKey) {
      // Local development only: print the code when explicitly enabled, never in production.
      if (this.config.get<string>('OTP_DEV_LOG_CODES') === 'true') {
        this.logger.warn(`[dev] OTP for ${phone}: ${code} (FAST2SMS_API_KEY not set)`);
        return;
      }
      throw new ServiceUnavailableException('OTP service is not configured');
    }

    const route = this.config.get<string>('FAST2SMS_ROUTE', 'dlt');
    const templateId = this.config.get<string>('FAST2SMS_DLT_TEMPLATE_ID');
    const senderId = this.config.get<string>('FAST2SMS_SENDER_ID');
    if (route === 'dlt' && (!templateId || !senderId)) {
      throw new ServiceUnavailableException('OTP DLT template or sender ID is not configured');
    }

    const body =
      route === 'dlt'
        ? { route, sender_id: senderId, message: templateId, variables_values: code, flash: 0, numbers: phone }
        : { route, variables_values: code, flash: 0, numbers: phone };

    const baseUrl = this.config.get<string>('FAST2SMS_BASE_URL', 'https://www.fast2sms.com');
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/dev/bulkV2`, {
        method: 'POST',
        headers: { authorization: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      this.logger.error(`Fast2SMS request failed: ${(error as Error).message}`);
      throw new BadGatewayException('Unable to send OTP. Please try again.');
    }

    const data = (await response.json().catch(() => null)) as Fast2smsResponse | null;
    if (!response.ok || data?.return !== true) {
      // Log the provider reason, never the OTP or the API key.
      this.logger.error(`Fast2SMS rejected OTP request: status=${response.status} message=${JSON.stringify(data?.message ?? null)}`);
      throw new BadGatewayException('Unable to send OTP. Please try again.');
    }
  }
}

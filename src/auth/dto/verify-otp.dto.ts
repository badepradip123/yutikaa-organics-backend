import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^[0-9+()\-\s]{10,20}$/)
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  otp!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;
}

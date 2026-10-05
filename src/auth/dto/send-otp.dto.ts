import { IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @Matches(/^[0-9+()\-\s]{10,20}$/)
  phone!: string;
}

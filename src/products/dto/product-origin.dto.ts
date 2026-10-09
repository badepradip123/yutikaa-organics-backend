import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProductOriginDto {
  @IsString() originId!: string;
  @IsOptional() @IsString() @MaxLength(120) locality?: string;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

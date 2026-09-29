import { IsBoolean, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCategoryHomeDto {
  @IsOptional() @IsString() imageUrl?: string | null;
  @IsOptional() @Type(() => Boolean) @IsBoolean() homepageEnabled?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}

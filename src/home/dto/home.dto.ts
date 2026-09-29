import { ContentMediaType } from '../../generated/prisma/client';
import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HeroBannerDto {
  @IsOptional() @IsString() eyebrow?: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() imageUrl!: string;
  @IsOptional() @IsString() mobileImageUrl?: string;
  @IsOptional() @IsString() ctaLabel?: string;
  @IsOptional() @IsString() ctaLink?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
  @IsOptional() startAt?: string | null;
  @IsOptional() endAt?: string | null;
}

export class PopularSpiceDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() link?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class BrandStoryDto {
  @IsOptional() @IsString() eyebrow?: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() buttonLabel?: string;
  @IsOptional() @IsString() buttonLink?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class WhyChooseItemDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class TestimonialDto {
  @IsString() customerName!: string;
  @IsOptional() @IsString() location?: string;
  @IsString() quote!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class CertificationDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class RecipeDto {
  @IsString() title!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsEnum(ContentMediaType) mediaType?: ContentMediaType;
  @IsOptional() @IsString() mediaUrl?: string;
  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isFeatured?: boolean;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isPublished?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}

export class NewsletterSubscriptionDto {
  @IsString() email!: string;
}

// Update DTOs keep ValidationPipe whitelist behaviour while making every field optional.
export class UpdateHeroBannerDto extends PartialType(HeroBannerDto) {}
export class UpdatePopularSpiceDto extends PartialType(PopularSpiceDto) {}
export class UpdateWhyChooseItemDto extends PartialType(WhyChooseItemDto) {}
export class UpdateTestimonialDto extends PartialType(TestimonialDto) {}
export class UpdateCertificationDto extends PartialType(CertificationDto) {}
export class UpdateRecipeDto extends PartialType(RecipeDto) {}

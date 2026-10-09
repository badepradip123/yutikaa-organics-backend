import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ProductOriginDto } from './product-origin.dto';

export class UpdateProductDto {
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MaxLength(180) slug?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() @MaxLength(300) shortDescription?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  // When present, replaces the product's full list of origins.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOriginDto)
  origins?: ProductOriginDto[];
}

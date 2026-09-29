import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceRoleKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    this.supabase = createClient(url, serviceRoleKey);
    this.bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET', 'product-images');
  }

  async uploadProductImage(productId: string, file: Express.Multer.File): Promise<string> {
    return this.uploadAsset(`products/${productId}`, file, ['image/jpeg', 'image/png', 'image/webp'], 5 * 1024 * 1024);
  }

  async uploadContentAsset(file: Express.Multer.File, folder = 'content'): Promise<{ url: string; mediaType: 'IMAGE' | 'VIDEO' }> {
    const cleanFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '') || 'content';
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allowed = [...imageTypes, ...videoTypes];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('Supported files: JPG, PNG, WebP, GIF, MP4, WebM or MOV');
    const maxSize = videoTypes.includes(file.mimetype) ? 40 * 1024 * 1024 : 8 * 1024 * 1024;
    const url = await this.uploadAsset(cleanFolder, file, allowed, maxSize);
    return { url, mediaType: videoTypes.includes(file.mimetype) ? 'VIDEO' : 'IMAGE' };
  }

  private async uploadAsset(folder: string, file: Express.Multer.File, allowedTypes: string[], maxSize: number): Promise<string> {
    if (!file) throw new BadRequestException('File is required');
    if (!allowedTypes.includes(file.mimetype)) throw new BadRequestException('Unsupported file type');
    if (file.size > maxSize) throw new BadRequestException(`File size must be ${Math.round(maxSize / 1024 / 1024)} MB or less`);

    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
      'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
    };
    const extension = extensionMap[file.mimetype] ?? 'bin';
    const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;

    const { error } = await this.supabase.storage.from(this.bucket).upload(filePath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw new InternalServerErrorException(`File upload failed: ${error.message}`);
    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }
}

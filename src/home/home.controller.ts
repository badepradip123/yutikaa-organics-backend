import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { BrandStoryDto, CertificationDto, HeroBannerDto, NewsletterSubscriptionDto, PopularSpiceDto, RecipeDto, TestimonialDto, WhyChooseItemDto, UpdateCertificationDto, UpdateHeroBannerDto, UpdatePopularSpiceDto, UpdateRecipeDto, UpdateTestimonialDto, UpdateWhyChooseItemDto } from './dto/home.dto';
import { HomeService } from './home.service';

@ApiTags('home')
@Controller('home')
export class HomeController {
  constructor(private readonly service: HomeService, private readonly storage: SupabaseStorageService) {}

  @Get()
  getHome() { return this.service.publicHome(); }

  @Post('newsletter')
  subscribe(@Body() dto: NewsletterSubscriptionDto) { return this.service.subscribeNewsletter(dto); }

  @Get('admin')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  getAdminContent() { return this.service.adminContent(); }

  @Post('admin/assets/upload')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, folder: { type: 'string' } }, required: ['file'] } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAsset(@UploadedFile() file: Express.Multer.File, @Body('folder') folder?: string) {
    if (!file) throw new BadRequestException('File is required');
    return this.storage.uploadContentAsset(file, folder);
  }

  @Post('admin/hero')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  createHero(@Body() dto: HeroBannerDto) { return this.service.createHero(dto); }
  @Patch('admin/hero/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  updateHero(@Param('id') id: string, @Body() dto: UpdateHeroBannerDto) { return this.service.updateHero(id, dto); }
  @Delete('admin/hero/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  deleteHero(@Param('id') id: string) { return this.service.removeHero(id); }

  @Post('admin/popular-spices')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  createPopular(@Body() dto: PopularSpiceDto) { return this.service.createPopularSpice(dto); }
  @Patch('admin/popular-spices/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  updatePopular(@Param('id') id: string, @Body() dto: UpdatePopularSpiceDto) { return this.service.updatePopularSpice(id, dto); }
  @Delete('admin/popular-spices/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  deletePopular(@Param('id') id: string) { return this.service.removePopularSpice(id); }

  @Post('admin/brand-story')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  saveBrandStory(@Body() dto: BrandStoryDto) { return this.service.upsertBrandStory(dto); }

  @Post('admin/why-choose')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  createWhy(@Body() dto: WhyChooseItemDto) { return this.service.createWhyChoose(dto); }
  @Patch('admin/why-choose/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  updateWhy(@Param('id') id: string, @Body() dto: UpdateWhyChooseItemDto) { return this.service.updateWhyChoose(id, dto); }
  @Delete('admin/why-choose/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  deleteWhy(@Param('id') id: string) { return this.service.removeWhyChoose(id); }

  @Post('admin/testimonials')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  createTestimonial(@Body() dto: TestimonialDto) { return this.service.createTestimonial(dto); }
  @Patch('admin/testimonials/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  updateTestimonial(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) { return this.service.updateTestimonial(id, dto); }
  @Delete('admin/testimonials/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  deleteTestimonial(@Param('id') id: string) { return this.service.removeTestimonial(id); }

  @Post('admin/certifications')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  createCertification(@Body() dto: CertificationDto) { return this.service.createCertification(dto); }
  @Patch('admin/certifications/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  updateCertification(@Param('id') id: string, @Body() dto: UpdateCertificationDto) { return this.service.updateCertification(id, dto); }
  @Delete('admin/certifications/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  deleteCertification(@Param('id') id: string) { return this.service.removeCertification(id); }

  @Post('admin/recipes')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  createRecipe(@Body() dto: RecipeDto) { return this.service.createRecipe(dto); }
  @Patch('admin/recipes/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  updateRecipe(@Param('id') id: string, @Body() dto: UpdateRecipeDto) { return this.service.updateRecipe(id, dto); }
  @Delete('admin/recipes/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.PRODUCT_ADMIN)
  deleteRecipe(@Param('id') id: string) { return this.service.removeRecipe(id); }
}

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { CategoriesService } from '../categories/categories.service';
import {
  BrandStoryDto,
  CertificationDto,
  HeroBannerDto,
  NewsletterSubscriptionDto,
  PopularSpiceDto,
  RecipeDto,
  TestimonialDto,
  WhyChooseItemDto,
} from './dto/home.dto';

function toSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function optionalDate(value?: string | null) {
  if (!value) return value ?? null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async publicHome() {
    const now = new Date();
    const [heroBanners, popularSpices, brandStory, whyChoose, testimonials, certifications, recipes, categories, bestSellers] = await Promise.all([
      this.prisma.heroBanner.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startAt: null }, { startAt: { lte: now } }] },
            { OR: [{ endAt: null }, { endAt: { gte: now } }] },
          ],
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.popularSpice.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.brandStory.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } }),
      this.prisma.whyChooseItem.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.testimonial.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }),
      this.prisma.certification.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.recipe.findMany({ where: { isPublished: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }).then((items) => items.slice(0, 8)),
      this.categoriesService.findAll(false, true),
      this.productsService.findAll({ page: 1, limit: 8, isFeatured: true, sortBy: 'updatedAt', sortOrder: 'desc' } as any),
    ]);

    return {
      heroBanners,
      popularSpices,
      categories,
      bestSellers: bestSellers.items,
      brandStory,
      whyChoose,
      testimonials,
      certifications,
      recipes,
    };
  }

  async adminContent() {
    const [heroBanners, popularSpices, brandStory, whyChoose, testimonials, certifications, recipes, categories] = await Promise.all([
      this.prisma.heroBanner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }),
      this.prisma.popularSpice.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.brandStory.findFirst({ where: { key: 'default' } }),
      this.prisma.whyChooseItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }),
      this.prisma.testimonial.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }),
      this.prisma.certification.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }),
      this.prisma.recipe.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }),
      this.categoriesService.findAll(true),
    ]);
    return { heroBanners, popularSpices, brandStory, whyChoose, testimonials, certifications, recipes, categories };
  }

  async createHero(dto: HeroBannerDto) {
    return this.prisma.heroBanner.create({ data: { ...dto, startAt: optionalDate(dto.startAt), endAt: optionalDate(dto.endAt) } as any });
  }
  async updateHero(id: string, dto: Partial<HeroBannerDto>) {
    await this.mustFind(this.prisma.heroBanner, id, 'Hero banner');
    return this.prisma.heroBanner.update({ where: { id }, data: { ...dto, startAt: optionalDate(dto.startAt), endAt: optionalDate(dto.endAt) } as any });
  }
  async removeHero(id: string) { await this.mustFind(this.prisma.heroBanner, id, 'Hero banner'); return this.prisma.heroBanner.delete({ where: { id } }); }

  async createPopularSpice(dto: PopularSpiceDto) {
    try { return await this.prisma.popularSpice.create({ data: { ...dto, slug: toSlug(dto.slug || dto.name) } }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Popular spice slug already exists'); throw error; }
  }
  async updatePopularSpice(id: string, dto: Partial<PopularSpiceDto>) {
    await this.mustFind(this.prisma.popularSpice, id, 'Popular spice');
    try { return await this.prisma.popularSpice.update({ where: { id }, data: { ...dto, ...(dto.slug ? { slug: toSlug(dto.slug) } : {}) } }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Popular spice slug already exists'); throw error; }
  }
  async removePopularSpice(id: string) { await this.mustFind(this.prisma.popularSpice, id, 'Popular spice'); return this.prisma.popularSpice.delete({ where: { id } }); }

  async upsertBrandStory(dto: BrandStoryDto) {
    return this.prisma.brandStory.upsert({ where: { key: 'default' }, create: { key: 'default', ...dto }, update: dto });
  }

  async createWhyChoose(dto: WhyChooseItemDto) { return this.prisma.whyChooseItem.create({ data: dto }); }
  async updateWhyChoose(id: string, dto: Partial<WhyChooseItemDto>) { await this.mustFind(this.prisma.whyChooseItem, id, 'Why choose item'); return this.prisma.whyChooseItem.update({ where: { id }, data: dto }); }
  async removeWhyChoose(id: string) { await this.mustFind(this.prisma.whyChooseItem, id, 'Why choose item'); return this.prisma.whyChooseItem.delete({ where: { id } }); }

  async createTestimonial(dto: TestimonialDto) { return this.prisma.testimonial.create({ data: dto }); }
  async updateTestimonial(id: string, dto: Partial<TestimonialDto>) { await this.mustFind(this.prisma.testimonial, id, 'Testimonial'); return this.prisma.testimonial.update({ where: { id }, data: dto }); }
  async removeTestimonial(id: string) { await this.mustFind(this.prisma.testimonial, id, 'Testimonial'); return this.prisma.testimonial.delete({ where: { id } }); }

  async createCertification(dto: CertificationDto) { return this.prisma.certification.create({ data: dto }); }
  async updateCertification(id: string, dto: Partial<CertificationDto>) { await this.mustFind(this.prisma.certification, id, 'Certification'); return this.prisma.certification.update({ where: { id }, data: dto }); }
  async removeCertification(id: string) { await this.mustFind(this.prisma.certification, id, 'Certification'); return this.prisma.certification.delete({ where: { id } }); }

  async createRecipe(dto: RecipeDto) {
    try { return await this.prisma.recipe.create({ data: { ...dto, slug: toSlug(dto.slug || dto.title) } }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Recipe slug already exists'); throw error; }
  }
  async updateRecipe(id: string, dto: Partial<RecipeDto>) {
    await this.mustFind(this.prisma.recipe, id, 'Recipe');
    try { return await this.prisma.recipe.update({ where: { id }, data: { ...dto, ...(dto.slug ? { slug: toSlug(dto.slug) } : {}) } }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Recipe slug already exists'); throw error; }
  }
  async removeRecipe(id: string) { await this.mustFind(this.prisma.recipe, id, 'Recipe'); return this.prisma.recipe.delete({ where: { id } }); }

  async subscribeNewsletter(dto: NewsletterSubscriptionDto) {
    const email = dto.email.trim().toLowerCase();
    if (!email.includes('@')) throw new ConflictException('Please provide a valid email address');
    return this.prisma.newsletterSubscription.upsert({ where: { email }, update: { isActive: true }, create: { email } });
  }

  private async mustFind(model: any, id: string, label: string) {
    const record = await model.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`${label} not found`);
    return record;
  }
}

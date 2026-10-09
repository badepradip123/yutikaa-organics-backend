import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOriginDto } from './dto/create-origin.dto';
import { UpdateOriginDto } from './dto/update-origin.dto';

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const originProductSelect = {
  id: true,
  name: true,
  slug: true,
  imageUrl: true,
  images: { orderBy: { sortOrder: 'asc' as const }, take: 1, select: { url: true } },
};

// Public responses only count and list products customers can actually buy.
function originInclude(includeHidden: boolean) {
  return {
    products: {
      where: includeHidden ? {} : { product: { status: 'ACTIVE' as const } },
      orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
      include: { product: { select: originProductSelect } },
    },
  };
}

type OriginWithProducts = Prisma.OriginGetPayload<{ include: ReturnType<typeof originInclude> }>;

function toOriginResponse(origin: OriginWithProducts) {
  return {
    id: origin.id,
    name: origin.name,
    slug: origin.slug,
    stateCode: origin.stateCode,
    tagline: origin.tagline,
    description: origin.description,
    imageUrl: origin.imageUrl,
    isActive: origin.isActive,
    sortOrder: origin.sortOrder,
    productCount: origin.products.length,
    spices: origin.products.map((link) => ({
      id: link.product.id,
      name: link.product.name,
      slug: link.product.slug,
      imageUrl: link.product.images[0]?.url ?? link.product.imageUrl,
      locality: link.locality,
      note: link.note,
    })),
  };
}

@Injectable()
export class OriginsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeHidden = false) {
    const origins = await this.prisma.origin.findMany({
      where: includeHidden ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: originInclude(includeHidden),
    });
    return origins.map(toOriginResponse);
  }

  async findBySlug(slug: string) {
    const origin = await this.prisma.origin.findUnique({
      where: { slug },
      include: originInclude(false),
    });
    if (!origin || !origin.isActive) throw new NotFoundException('Origin not found');
    return toOriginResponse(origin);
  }

  async create(dto: CreateOriginDto) {
    const slug = toSlug(dto.slug?.trim() || dto.name);
    try {
      return await this.prisma.origin.create({ data: { ...dto, name: dto.name.trim(), slug } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Origin name or slug already exists');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateOriginDto) {
    await this.ensureExists(id);
    try {
      return await this.prisma.origin.update({
        where: { id },
        data: {
          ...dto,
          name: dto.name?.trim(),
          slug: dto.slug?.trim() ? toSlug(dto.slug) : undefined,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Origin name or slug already exists');
      }
      throw error;
    }
  }

  async deactivate(id: string) {
    await this.ensureExists(id);
    return this.prisma.origin.update({ where: { id }, data: { isActive: false } });
  }

  private async ensureExists(id: string) {
    const origin = await this.prisma.origin.findUnique({ where: { id }, select: { id: true } });
    if (!origin) throw new NotFoundException('Origin not found');
  }
}

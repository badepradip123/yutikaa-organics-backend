import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListRecipesDto } from './dto/list-recipes.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListRecipesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const where: Prisma.RecipeWhereInput = {
      isPublished: true,
      ...(query.isFeatured === undefined ? {} : { isFeatured: query.isFeatured }),
      ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { excerpt: { contains: query.search, mode: 'insensitive' } },
              { content: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.recipe.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.recipe.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /** Distinct published recipe categories with counts, for the browse filters. */
  async categories() {
    const grouped = await this.prisma.recipe.groupBy({
      by: ['category'],
      where: { isPublished: true, NOT: { category: null } },
      _count: { _all: true },
    });
    return grouped
      .filter((row) => row.category)
      .map((row) => ({ category: row.category as string, count: row._count._all }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  async findBySlug(slug: string) {
    const recipe = await this.prisma.recipe.findFirst({ where: { slug, isPublished: true } });
    if (!recipe) throw new NotFoundException('Recipe not found');
    return recipe;
  }
}

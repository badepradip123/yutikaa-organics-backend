import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListRecipesDto } from './dto/list-recipes.dto';
import { RecipesService } from './recipes.service';

@ApiTags('recipes')
@Controller('recipes')
export class RecipesController {
  constructor(private readonly service: RecipesService) {}

  @Get()
  findAll(@Query() query: ListRecipesDto) {
    return this.service.findAll(query);
  }

  @Get('categories')
  categories() {
    return this.service.categories();
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }
}

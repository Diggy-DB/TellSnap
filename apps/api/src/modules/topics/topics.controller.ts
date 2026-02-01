import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TopicsService } from './topics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('topics')
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  @ApiOperation({ summary: 'List all topics' })
  @ApiQuery({ name: 'category', required: false })
  async list(@Query('category') category?: string) {
    return this.topicsService.list(category);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new topic' })
  async create(
    @Body() body: { title: string; description?: string; category?: string },
    @CurrentUser() user: { sub: string },
  ) {
    return this.topicsService.create(body, user.sub);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all topic categories' })
  async getCategories() {
    return this.topicsService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get topic by ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.topicsService.findById(id);
  }
}

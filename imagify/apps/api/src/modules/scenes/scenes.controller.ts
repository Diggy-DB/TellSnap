import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ScenesService } from './scenes.service';
import { SceneBibleService } from './scene-bible.service';
import { CreateSceneDto, ContinueSceneDto, ListScenesQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '@storyforge/shared';

@ApiTags('scenes')
@Controller('scenes')
export class ScenesController {
  constructor(
    private readonly scenesService: ScenesService,
    private readonly sceneBibleService: SceneBibleService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List scenes with pagination' })
  async listScenes(@Query() query: ListScenesQueryDto) {
    return this.scenesService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scene by ID' })
  async getScene(@Param('id') id: string) {
    return this.scenesService.findById(id);
  }

  @Get(':id/playlist')
  @ApiOperation({ summary: 'Get scene playlist for video playback (deprecated)' })
  async getPlaylist(@Param('id') id: string) {
    // Redirect to pages for backward compatibility
    return this.scenesService.getPages(id);
  }

  @Get(':id/pages')
  @ApiOperation({ summary: 'Get all comic pages for a scene' })
  async getPages(@Param('id') id: string) {
    return this.scenesService.getPages(id);
  }

  @Get(':id/bible')
  @ApiOperation({ summary: 'Get scene bible (continuity data)' })
  async getBible(@Param('id') id: string) {
    return this.sceneBibleService.getForScene(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new scene' })
  async createScene(
    @Body() dto: CreateSceneDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scenesService.create(dto, user.sub);
  }

  @Post(':id/continue')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Continue a scene with a new segment' })
  async continueScene(
    @Param('id') id: string,
    @Body() dto: ContinueSceneDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // For demo: use authenticated user or fallback to scene creator
    const userId = user?.sub || 'anonymous';
    return this.scenesService.continue(id, dto, userId);
  }
}

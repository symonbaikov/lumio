import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  // Без значения по умолчанию у параметра: babel не умеет транспилировать
  // параметр-декоратор вместе с default value и выдаёт синтаксически битый JS.
  async search(@WorkspaceId() workspaceId: string, @Query('q') q?: string) {
    return this.searchService.search(workspaceId, q ?? '');
  }

  @Get('recent')
  async recent(@WorkspaceId() workspaceId: string) {
    return this.searchService.recent(workspaceId);
  }

  @Get('favorites')
  async favorites(@WorkspaceId() workspaceId: string, @CurrentUser() user: User) {
    return this.searchService.favorites(workspaceId, user.id);
  }

  @Put('favorites/:statementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async addFavorite(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: User,
    @Param('statementId', ParseUUIDPipe) statementId: string,
  ): Promise<void> {
    await this.searchService.addFavorite(workspaceId, user.id, statementId);
  }

  @Delete('favorites/:statementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFavorite(
    @CurrentUser() user: User,
    @Param('statementId', ParseUUIDPipe) statementId: string,
  ): Promise<void> {
    await this.searchService.removeFavorite(user.id, statementId);
  }
}

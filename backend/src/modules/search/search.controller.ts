import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@WorkspaceId() workspaceId: string, @Query('q') q = '') {
    return this.searchService.search(workspaceId, q);
  }
}

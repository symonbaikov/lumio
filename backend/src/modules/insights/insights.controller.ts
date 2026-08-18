import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InsightsService } from './insights.service';

@Controller('insights')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get()
  async list(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.insightsService.list({
      userId: user.id,
      workspaceId,
      category,
      limit: limit ? Number(limit) : 30,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get('summary')
  async summary(@CurrentUser() user: User, @WorkspaceId() workspaceId: string) {
    return this.insightsService.getSummary(user.id, workspaceId);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@CurrentUser() user: User, @WorkspaceId() workspaceId: string) {
    return this.insightsService.refresh(user.id, workspaceId);
  }

  @Post('dismiss-all')
  @HttpCode(HttpStatus.OK)
  async dismissAll(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query('category') category?: string,
  ) {
    return this.insightsService.dismissAll(user.id, workspaceId, category);
  }

  @Post(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  async dismiss(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.insightsService.dismiss(user.id, workspaceId, id);
  }
}

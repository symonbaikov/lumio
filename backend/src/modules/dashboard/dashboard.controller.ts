import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query('range') range: '7d' | '30d' | '90d' | 'month' = '30d',
    @Query('date') date?: string,
  ) {
    const validRange: '7d' | '30d' | '90d' | 'month' = ['7d', '30d', '90d', 'month'].includes(
      range,
    )
      ? range
      : '30d';
    return this.dashboardService.getDashboard(user.id, workspaceId, validRange, date);
  }

  @Get('trends')
  async getTrends(
    @CurrentUser() _user: User,
    @WorkspaceId() workspaceId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.dashboardService.getTrends(workspaceId, days);
  }

  @Get('commitments')
  async getCommitments(
    @WorkspaceId() workspaceId: string,
    @Query('days', new DefaultValuePipe(60), ParseIntPipe) days: number,
  ) {
    return this.dashboardService.getCommitments(workspaceId, days);
  }
}

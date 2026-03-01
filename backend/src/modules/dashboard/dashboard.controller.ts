import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
    @Query('range') range: '7d' | '30d' | '90d' = '30d',
    @Query('date') date?: string,
  ) {
    const validRange: '7d' | '30d' | '90d' = ['7d', '30d', '90d'].includes(range) ? range : '30d';
    return this.dashboardService.getDashboard(user.id, user.workspaceId, validRange, date);
  }
}

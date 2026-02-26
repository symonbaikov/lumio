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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InsightsService } from './insights.service';

@Controller('insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get()
  async list(
    @CurrentUser() user: User,
    @Query('workspaceId') workspaceId?: string,
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
  async summary(@CurrentUser() user: User, @Query('workspaceId') workspaceId?: string) {
    return this.insightsService.getSummary(user.id, workspaceId);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@CurrentUser() user: User, @Query('workspaceId') workspaceId?: string) {
    return this.insightsService.refreshOperational(user.id, workspaceId ?? null);
  }

  @Post('dismiss-all')
  @HttpCode(HttpStatus.OK)
  async dismissAll(@CurrentUser() user: User, @Query('category') category?: string) {
    return this.insightsService.dismissAll(user.id, category);
  }

  @Post(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  async dismiss(@CurrentUser() user: User, @Param('id') id: string) {
    return this.insightsService.dismiss(user.id, id);
  }
}

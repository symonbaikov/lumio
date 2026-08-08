import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { InsightCategory, InsightSeverity, InsightType } from '../../entities';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InsightsService } from '../insights/insights.service';
import { SaveAiInsightDto } from './dto/ai-insight.dto';

@Controller('ai-analysis/insights')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
export class AiInsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  /**
   * Receives an insight written by the model in the browser.
   *
   * Deduplicated by period so reopening the page regenerates the text without
   * stacking a new row every time — see .claude/rules/idempotency.md.
   */
  @Post()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  save(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() body: SaveAiInsightDto,
  ) {
    return this.insightsService.saveExternal(user.id, workspaceId, {
      type: InsightType.AI_SUMMARY,
      category: InsightCategory.TREND,
      severity: InsightSeverity.INFO,
      title: body.title,
      message: body.message,
      deduplicationKey: `${InsightType.AI_SUMMARY}:${body.periodKey}`,
      data: { periodKey: body.periodKey, modelId: body.modelId, source: 'local-model' },
    });
  }
}

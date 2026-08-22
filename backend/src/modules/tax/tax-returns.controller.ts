import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { TaxReturnPeriodDto } from './dto/tax-return-period.dto';
import { TaxReturnsService } from './tax-returns.service';

@Controller('tax/returns')
export class TaxReturnsController {
  constructor(private readonly taxReturnsService: TaxReturnsService) {}

  @Get()
  @WorkspaceAuth(Permission.CATEGORY_VIEW)
  async findAll(@WorkspaceId() workspaceId: string) {
    return this.taxReturnsService.findAll(workspaceId);
  }

  /** Draft for a period, recomputed on every read until it is filed. */
  @Get('period')
  @WorkspaceAuth(Permission.CATEGORY_VIEW)
  async getForPeriod(
    @WorkspaceId() workspaceId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.taxReturnsService.getForPeriod(workspaceId, periodStart, periodEnd);
  }

  /** The lines behind a period, without persisting anything. */
  @Get('preview')
  @WorkspaceAuth(Permission.CATEGORY_VIEW)
  async preview(
    @WorkspaceId() workspaceId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.taxReturnsService.computeTotals(workspaceId, periodStart, periodEnd);
  }

  // Filing locks transactions and records a submission, so it sits behind
  // settings management rather than the view permission.
  @Post('file')
  @WorkspaceAuth(Permission.WORKSPACE_SETTINGS_MANAGE)
  async file(@WorkspaceId() workspaceId: string, @Body() dto: TaxReturnPeriodDto) {
    return this.taxReturnsService.file(workspaceId, dto.periodStart, dto.periodEnd);
  }

  @Post('reopen')
  @WorkspaceAuth(Permission.WORKSPACE_SETTINGS_MANAGE)
  async reopen(@WorkspaceId() workspaceId: string, @Body() dto: TaxReturnPeriodDto) {
    return this.taxReturnsService.reopen(workspaceId, dto.periodStart, dto.periodEnd);
  }
}

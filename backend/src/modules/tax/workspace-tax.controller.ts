import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { SetJurisdictionDto } from './dto/set-jurisdiction.dto';
import { JurisdictionAdoptionService } from './jurisdiction-adoption.service';
import { TaxRatesService } from './tax-rates.service';

/**
 * A workspace's own tax configuration, as opposed to the global catalogue
 * served by JurisdictionsController.
 */
@Controller('tax/settings')
export class WorkspaceTaxController {
  constructor(
    private readonly adoptionService: JurisdictionAdoptionService,
    private readonly taxRatesService: TaxRatesService,
  ) {}

  @Get()
  @WorkspaceAuth(Permission.CATEGORY_VIEW)
  async getSettings(@WorkspaceId() workspaceId: string) {
    return {
      jurisdiction: await this.adoptionService.getCurrentJurisdiction(workspaceId),
    };
  }

  /**
   * Rates the workspace can actually apply on a given day, default today.
   * The date matters: a rate set changes over time, and the UI should show
   * what applies to the document being entered, not what applies now.
   */
  @Get('rates')
  @WorkspaceAuth(Permission.CATEGORY_VIEW)
  async getRatesInForce(@WorkspaceId() workspaceId: string, @Query('date') date?: string) {
    return this.taxRatesService.findEnabledForDate(workspaceId, date ?? new Date());
  }

  /**
   * Picks the workspace's country and copies that jurisdiction's statutory
   * rates in. Guarded by settings management rather than category permissions:
   * this changes how money is taxed, not how it is labelled.
   */
  @Put('jurisdiction')
  @WorkspaceAuth(Permission.WORKSPACE_SETTINGS_MANAGE)
  async setJurisdiction(@WorkspaceId() workspaceId: string, @Body() dto: SetJurisdictionDto) {
    return this.adoptionService.adopt(workspaceId, dto.code, dto.effectiveFrom);
  }
}

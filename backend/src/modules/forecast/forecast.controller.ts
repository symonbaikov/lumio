import { Controller, Get, Query } from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { ForecastQueryDto } from './dto/forecast-query.dto';
import { ForecastService } from './forecast.service';

@Controller('forecast')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  /** Projected balance for 30/90/365 days with safe-to-spend, shortfall date, runway and scenarios. */
  @Get()
  @WorkspaceAuth(Permission.REPORT_VIEW)
  async getForecast(@WorkspaceId() workspaceId: string, @Query() query: ForecastQueryDto) {
    return this.forecastService.getForecast(workspaceId, query);
  }
}

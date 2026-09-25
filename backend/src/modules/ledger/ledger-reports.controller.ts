import { BadRequestException, Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import {
  AccountLedgerQueryDto,
  LedgerDateQueryDto,
  LedgerPeriodQueryDto,
} from './dto/ledger-report-query.dto';
import {
  type AccountLedger,
  type BalanceSheet,
  LedgerReportsService,
  type ProfitAndLoss,
  type TrialBalance,
} from './ledger-reports.service';

function assertPeriod(query: LedgerPeriodQueryDto): void {
  if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
    throw new BadRequestException('dateFrom must not be after dateTo');
  }
}

/**
 * Reports built from the journal. Each refuses with LEDGER_NOT_UP_TO_DATE
 * while transactions are still being booked, unless `allowStale=true`.
 */
@Controller('ledger/reports')
export class LedgerReportsController {
  constructor(private readonly reportsService: LedgerReportsService) {}

  @Get('trial-balance')
  @WorkspaceAuth(Permission.LEDGER_VIEW)
  async trialBalance(
    @WorkspaceId() workspaceId: string,
    @Query() query: LedgerPeriodQueryDto,
  ): Promise<TrialBalance> {
    assertPeriod(query);
    return this.reportsService.trialBalance(workspaceId, query, query);
  }

  @Get('profit-and-loss')
  @WorkspaceAuth(Permission.LEDGER_VIEW)
  async profitAndLoss(
    @WorkspaceId() workspaceId: string,
    @Query() query: LedgerPeriodQueryDto,
  ): Promise<ProfitAndLoss> {
    assertPeriod(query);
    return this.reportsService.profitAndLoss(workspaceId, query, query);
  }

  @Get('balance-sheet')
  @WorkspaceAuth(Permission.LEDGER_VIEW)
  async balanceSheet(
    @WorkspaceId() workspaceId: string,
    @Query() query: LedgerDateQueryDto,
  ): Promise<BalanceSheet> {
    return this.reportsService.balanceSheet(workspaceId, query, query);
  }

  /** The account card: every line in the period with a running balance. */
  @Get('accounts/:id')
  @WorkspaceAuth(Permission.LEDGER_VIEW)
  async accountLedger(
    @WorkspaceId() workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AccountLedgerQueryDto,
  ): Promise<AccountLedger> {
    assertPeriod(query);
    return this.reportsService.accountLedger(workspaceId, id, query, query);
  }
}

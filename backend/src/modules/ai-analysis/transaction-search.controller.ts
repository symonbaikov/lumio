import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { BackfillEmbeddingsDto, SearchTransactionsDto } from './dto/transaction-search.dto';
import { TransactionSearchService } from './transaction-search.service';

@Controller('ai-analysis/search')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
export class TransactionSearchController {
  constructor(private readonly searchService: TransactionSearchService) {}

  /**
   * POST rather than GET: the query is free text that may contain a merchant
   * name or amount, and query strings end up in access logs and browser history.
   */
  // Tighter than the global 500/min: each call runs a transformer forward pass
  // on the API process, so this is CPU the whole deployment shares.
  @Post()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  search(@WorkspaceId() workspaceId: string, @Body() body: SearchTransactionsDto) {
    return this.searchService.search(workspaceId, body.query, body.limit);
  }

  // Tighter still: one call embeds up to a few hundred transactions.
  @Post('backfill')
  @Throttle({ default: { limit: 6, ttl: 60000 } })
  backfill(@WorkspaceId() workspaceId: string, @Body() body: BackfillEmbeddingsDto) {
    return this.searchService.backfill(workspaceId, body.batchSize);
  }
}

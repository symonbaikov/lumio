import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CustomTableImportJobsService } from '../custom-tables/custom-table-import-jobs.service';
import { SheetTransactionCommitDto } from './dto/sheet-transaction-commit.dto';
import { SheetTransactionPreviewDto } from './dto/sheet-transaction-preview.dto';
import { SheetTransactionImportService } from './services/sheet-transaction-import.service';

/** HTTP endpoints for Google Sheets -> transactions import (preview, commit, job status). */
@ApiTags('Import')
@Controller('import')
export class SheetTransactionImportController {
  constructor(
    private readonly sheetTransactionImportService: SheetTransactionImportService,
    private readonly customTableImportJobsService: CustomTableImportJobsService,
  ) {}

  @Post('google-sheets/transactions/preview')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  @ApiOperation({ summary: 'Preview a Google Sheets transaction import' })
  @ApiResponse({ status: 201, description: 'Preview result with mapped rows and summary' })
  async preview(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: SheetTransactionPreviewDto,
  ) {
    return this.sheetTransactionImportService.preview(workspaceId, user.id, dto);
  }

  @Post('google-sheets/transactions/commit')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  @ApiOperation({ summary: 'Commit a Google Sheets transaction import' })
  @ApiResponse({ status: 201, description: 'Queued job id for the commit' })
  async commit(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: SheetTransactionCommitDto,
  ) {
    return this.sheetTransactionImportService.commit(workspaceId, user.id, dto);
  }

  @Get('jobs/:jobId')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  @ApiOperation({ summary: 'Get the status of an import job' })
  @ApiResponse({ status: 200, description: 'Job status, progress, and result' })
  async getJob(@CurrentUser() user: User, @Param('jobId', new ParseUUIDPipe()) jobId: string) {
    const job = await this.customTableImportJobsService.getJobForUser(user.id, jobId);
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    };
  }
}

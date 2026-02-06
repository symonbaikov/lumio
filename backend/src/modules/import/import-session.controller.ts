import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { Statement, StatementStatus } from '../../entities/statement.entity';
import { StatementProcessingService } from '../parsing/services/statement-processing.service';
import { ConflictResolutionMap, ImportSessionService } from './services/import-session.service';

@Controller()
@UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
export class ImportSessionController {
  constructor(
    private readonly importSessionService: ImportSessionService,
    @Inject(forwardRef(() => StatementProcessingService))
    private readonly statementProcessingService: StatementProcessingService,
    @InjectRepository(Statement)
    private readonly statementRepository: Repository<Statement>,
  ) {}

  @Get('import-sessions/:id')
  @RequirePermission(Permission.STATEMENT_VIEW)
  async getSessionSummary(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    const session = await this.importSessionService.getSession(id);
    if (session.workspaceId !== workspaceId) {
      throw new NotFoundException('Import session not found');
    }
    return this.importSessionService.getSessionSummary(id);
  }

  @Get('statements/:id/import-preview')
  @RequirePermission(Permission.STATEMENT_VIEW)
  async getImportPreview(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    const statement = await this.statementRepository.findOne({
      where: { id, workspaceId },
    });

    if (!statement) {
      throw new NotFoundException('Statement not found');
    }

    if (statement.parsingDetails?.importPreview) {
      return {
        statementId: statement.id,
        status: statement.status,
        importPreview: statement.parsingDetails.importPreview,
      };
    }

    if (
      statement.status === StatementStatus.COMPLETED ||
      statement.status === StatementStatus.PARSED
    ) {
      return {
        statementId: statement.id,
        status: statement.status,
        importPreview: null,
      };
    }

    const processed = await this.statementProcessingService.processStatement(statement.id);
    return {
      statementId: processed.id,
      status: processed.status,
      importPreview: processed.parsingDetails?.importPreview ?? null,
    };
  }

  @Post('statements/:id/import-commit')
  @RequirePermission(Permission.STATEMENT_EDIT)
  async commitImport(
    @Param('id') id: string,
    @Body() body: { resolutions?: ConflictResolutionMap },
    @WorkspaceId() workspaceId: string,
  ) {
    const statement = await this.statementRepository.findOne({
      where: { id, workspaceId },
    });

    if (!statement) {
      throw new NotFoundException('Statement not found');
    }

    const importPreview = statement.parsingDetails?.importPreview as
      | { sessionId?: string }
      | undefined;
    if (!importPreview?.sessionId) {
      if (statement.status === StatementStatus.COMPLETED) {
        return {
          statementId: statement.id,
          status: statement.status,
          importCommit: statement.parsingDetails?.importCommit ?? null,
        };
      }
      throw new BadRequestException('Import preview session not found');
    }

    if (body?.resolutions) {
      await this.importSessionService.resolveConflicts(importPreview.sessionId, body.resolutions);
    }

    const committed = await this.statementProcessingService.commitImport(statement.id);

    return {
      statementId: committed.id,
      status: committed.status,
      importCommit: committed.parsingDetails?.importCommit ?? null,
    };
  }

  @Post('import-sessions/:id/cancel')
  @RequirePermission(Permission.STATEMENT_EDIT)
  async cancelSession(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    const session = await this.importSessionService.getSession(id);
    if (session.workspaceId !== workspaceId) {
      throw new NotFoundException('Import session not found');
    }
    await this.importSessionService.cancelSession(id);
    return { cancelled: true };
  }
}

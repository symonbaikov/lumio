import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { buildContentDisposition } from '../../common/utils/http-file.util';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BalanceService } from './balance.service';
import { BalanceQueryDto } from './dto/balance-query.dto';
import { CreateBalanceAccountDto } from './dto/create-balance-account.dto';
import { ExportBalanceDto } from './dto/export-balance.dto';
import { UpdateAccountClassificationDto } from './dto/update-account-classification.dto';
import { UpdateBalanceSnapshotDto } from './dto/update-balance-snapshot.dto';

@Controller('reports/balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get('sheet')
  @WorkspaceAuth(Permission.REPORT_VIEW)
  async getSheet(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query() query: BalanceQueryDto,
  ): Promise<unknown> {
    return this.balanceService.getBalanceSheet(
      workspaceId,
      query.date,
      query.locale || user.locale,
    );
  }

  @Get('accounts')
  @WorkspaceAuth(Permission.REPORT_VIEW)
  async getAccounts(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query() query: BalanceQueryDto,
  ): Promise<unknown> {
    return this.balanceService.getAccountsTree(
      workspaceId,
      query.date,
      query.locale || user.locale,
    );
  }

  @Put('snapshot')
  @WorkspaceAuth(Permission.REPORT_VIEW)
  async updateSnapshot(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateBalanceSnapshotDto,
  ) {
    return this.balanceService.updateSnapshot(user.id, workspaceId, dto);
  }

  @Post('accounts')
  @WorkspaceAuth(Permission.REPORT_VIEW)
  async createAccount(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateBalanceAccountDto,
  ) {
    return this.balanceService.createCustomAccount(user.id, workspaceId, dto);
  }

  @Delete('accounts/:id')
  @HttpCode(204)
  @WorkspaceAuth(Permission.REPORT_VIEW)
  async deleteAccount(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.balanceService.deleteCustomAccount(user.id, workspaceId, id);
  }

  @Patch('accounts/:id/classification')
  @WorkspaceAuth(Permission.REPORT_VIEW)
  async updateClassification(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAccountClassificationDto,
  ) {
    return this.balanceService.updateAccountClassification(user.id, workspaceId, id, dto);
  }

  @Get('export')
  @WorkspaceAuth(Permission.REPORT_EXPORT)
  async exportBalance(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query() dto: ExportBalanceDto,
    @Res() res: Response,
  ) {
    const payload = await this.balanceService.exportBalanceSheet(
      workspaceId,
      dto,
      dto.locale || user.locale,
    );

    res.setHeader('Content-Type', payload.contentType);
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', payload.fileName));
    res.send(payload.buffer);
  }
}

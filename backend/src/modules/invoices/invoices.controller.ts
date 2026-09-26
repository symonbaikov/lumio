import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { buildContentDisposition } from '../../common/utils/http-file.util';
import { deletedResponse } from '../../common/utils/responses.util';
import { EntityType } from '../../entities/audit-event.entity';
import type { User } from '../../entities/user.entity';
import { Audit } from '../audit/decorators/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FilterInvoicesDto } from './dto/filter-invoices.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @WorkspaceAuth(Permission.INVOICE_CREATE)
  @Audit({ entityType: EntityType.INVOICE, includeDiff: true, isUndoable: true })
  async create(@Body() dto: CreateInvoiceDto, @WorkspaceId() workspaceId: string) {
    return this.invoicesService.create(workspaceId, dto);
  }

  @Get()
  @WorkspaceAuth(Permission.INVOICE_VIEW)
  async findAll(@WorkspaceId() workspaceId: string, @Query() query: FilterInvoicesDto) {
    return this.invoicesService.findAll(workspaceId, query);
  }

  @Get('settings')
  @WorkspaceAuth(Permission.INVOICE_VIEW)
  async getSettings(@WorkspaceId() workspaceId: string) {
    return this.invoicesService.getNumberingSettings(workspaceId);
  }

  @Put('settings')
  @WorkspaceAuth(Permission.INVOICE_EDIT)
  async updateSettings(@Body('prefix') prefix: string, @WorkspaceId() workspaceId: string) {
    return this.invoicesService.updateNumberPrefix(workspaceId, prefix);
  }

  @Get(':id')
  @WorkspaceAuth(Permission.INVOICE_VIEW)
  async findOne(@Param('id', new ParseUUIDPipe()) id: string, @WorkspaceId() workspaceId: string) {
    return this.invoicesService.findOne(id, workspaceId);
  }

  @Get(':id/pdf')
  @WorkspaceAuth(Permission.INVOICE_VIEW)
  async downloadPdf(
    @Param('id', new ParseUUIDPipe()) id: string,
    @WorkspaceId() workspaceId: string,
    @Res() res: Response,
  ) {
    const { fileName, data } = await this.invoicesService.getPdf(id, workspaceId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', fileName));
    res.send(data);
  }

  @Put(':id')
  @WorkspaceAuth(Permission.INVOICE_EDIT)
  @Audit({ entityType: EntityType.INVOICE, includeDiff: true, isUndoable: true })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateInvoiceDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.invoicesService.update(id, workspaceId, dto);
  }

  @Put(':id/send')
  @WorkspaceAuth(Permission.INVOICE_EDIT)
  @Audit({ entityType: EntityType.INVOICE, includeDiff: true, isUndoable: false })
  async send(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.invoicesService.send(id, workspaceId, user.id);
  }

  @Put(':id/void')
  @WorkspaceAuth(Permission.INVOICE_EDIT)
  @Audit({ entityType: EntityType.INVOICE, includeDiff: true, isUndoable: false })
  async void(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.invoicesService.void(id, workspaceId, user.id);
  }

  @Delete(':id')
  @WorkspaceAuth(Permission.INVOICE_DELETE)
  @Audit({ entityType: EntityType.INVOICE, includeDiff: true, isUndoable: true })
  async remove(@Param('id', new ParseUUIDPipe()) id: string, @WorkspaceId() workspaceId: string) {
    await this.invoicesService.remove(id, workspaceId);
    return deletedResponse('Invoice');
  }
}

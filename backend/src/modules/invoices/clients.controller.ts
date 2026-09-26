import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { deletedResponse } from '../../common/utils/responses.util';
import { EntityType } from '../../entities/audit-event.entity';
import { Audit } from '../audit/decorators/audit.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @WorkspaceAuth(Permission.CLIENT_CREATE)
  @Audit({ entityType: EntityType.CLIENT, includeDiff: true, isUndoable: true })
  async create(@Body() dto: CreateClientDto, @WorkspaceId() workspaceId: string) {
    return this.clientsService.create(workspaceId, dto);
  }

  @Get()
  @WorkspaceAuth(Permission.CLIENT_VIEW)
  async findAll(@WorkspaceId() workspaceId: string) {
    return this.clientsService.findAll(workspaceId);
  }

  @Get(':id')
  @WorkspaceAuth(Permission.CLIENT_VIEW)
  async findOne(@Param('id', new ParseUUIDPipe()) id: string, @WorkspaceId() workspaceId: string) {
    return this.clientsService.findOne(id, workspaceId);
  }

  @Put(':id')
  @WorkspaceAuth(Permission.CLIENT_EDIT)
  @Audit({ entityType: EntityType.CLIENT, includeDiff: true, isUndoable: true })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClientDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.clientsService.update(id, workspaceId, dto);
  }

  @Delete(':id')
  @WorkspaceAuth(Permission.CLIENT_DELETE)
  @Audit({ entityType: EntityType.CLIENT, includeDiff: true, isUndoable: true })
  async remove(@Param('id', new ParseUUIDPipe()) id: string, @WorkspaceId() workspaceId: string) {
    await this.clientsService.remove(id, workspaceId);
    return deletedResponse('Client');
  }
}

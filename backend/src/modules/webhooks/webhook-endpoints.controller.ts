import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { CreateWebhookEndpointDto } from './dto/create-webhook-endpoint.dto';
import { UpdateWebhookEndpointDto } from './dto/update-webhook-endpoint.dto';
import { WebhookEndpointsService } from './services/webhook-endpoints.service';

@ApiTags('Webhook Endpoints')
@Controller('webhook-endpoints')
export class WebhookEndpointsController {
  constructor(private readonly service: WebhookEndpointsService) {}

  @Post()
  @WorkspaceAuth(Permission.STATEMENT_UPLOAD)
  @ApiOperation({ summary: 'Create inbound webhook endpoint' })
  async create(@WorkspaceId() workspaceId: string, @Body() dto: CreateWebhookEndpointDto) {
    return this.service.create(workspaceId, dto); // token returned only on creation
  }

  @Get()
  @WorkspaceAuth(Permission.STATEMENT_VIEW)
  async findAll(@WorkspaceId() workspaceId: string) {
    const endpoints = await this.service.findAll(workspaceId);
    return endpoints.map(({ token, ...rest }) => ({
      ...rest,
      tokenPreview: `${token.slice(0, 8)}...`,
    }));
  }

  @Get(':id')
  @WorkspaceAuth(Permission.STATEMENT_VIEW)
  async findOne(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    const { token, ...rest } = await this.service.findOne(id, workspaceId);
    return { ...rest, tokenPreview: `${token.slice(0, 8)}...` };
  }

  @Patch(':id')
  @WorkspaceAuth(Permission.STATEMENT_EDIT)
  async update(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateWebhookEndpointDto,
  ) {
    const { token, ...rest } = await this.service.update(id, workspaceId, dto);
    return { ...rest, tokenPreview: `${token.slice(0, 8)}...` };
  }

  @Delete(':id')
  @WorkspaceAuth(Permission.STATEMENT_DELETE)
  async delete(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    await this.service.delete(id, workspaceId);
    return { success: true };
  }
}

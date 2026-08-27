import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('API Keys')
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @WorkspaceAuth(Permission.API_KEY_MANAGE)
  @ApiOperation({ summary: 'Create API key (returned only once)' })
  async create(
    @Body() dto: CreateApiKeyDto,
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: User,
  ) {
    return this.apiKeysService.generate(workspaceId, user.id, dto.name);
  }

  @Get()
  @WorkspaceAuth(Permission.API_KEY_MANAGE)
  @ApiOperation({ summary: 'List API keys (without secrets)' })
  async list(@WorkspaceId() workspaceId: string) {
    const keys = await this.apiKeysService.list(workspaceId);
    return keys.map(({ keyHash, ...rest }) => rest);
  }

  @Delete(':id')
  @WorkspaceAuth(Permission.API_KEY_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke API key' })
  async revoke(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    await this.apiKeysService.revoke(id, workspaceId);
  }
}

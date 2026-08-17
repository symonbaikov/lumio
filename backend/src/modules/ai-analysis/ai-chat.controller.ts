import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiChatService } from './ai-chat.service';
import { AppendAiChatMessageDto, CreateAiChatDto, RenameAiChatDto } from './dto/ai-chat.dto';

@Controller('ai-analysis/chats')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Get()
  list(@WorkspaceId() workspaceId: string) {
    return this.aiChatService.list(workspaceId);
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Body() body: CreateAiChatDto,
  ) {
    return this.aiChatService.create(workspaceId, user.id, body.modelId, body.firstQuestion);
  }

  @Get(':id')
  get(@WorkspaceId() workspaceId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.aiChatService.get(workspaceId, id);
  }

  @Post(':id/messages')
  appendMessage(
    @WorkspaceId() workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AppendAiChatMessageDto,
  ) {
    return this.aiChatService.appendMessage(
      workspaceId,
      id,
      body.role,
      body.content,
      body.actionPayload,
    );
  }

  @Patch(':id')
  rename(
    @WorkspaceId() workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RenameAiChatDto,
  ) {
    return this.aiChatService.rename(workspaceId, id, body.title);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@WorkspaceId() workspaceId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.aiChatService.remove(workspaceId, id);
  }
}

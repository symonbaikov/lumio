import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { ChatCompletionService } from './chat-completion.service';
import { CreateChatCompletionDto } from './dto/chat-completion.dto';

@Controller('ai-analysis/completions')
@UseGuards(JwtAuthGuard, WorkspaceContextGuard)
export class ChatCompletionController {
  constructor(private readonly chatCompletionService: ChatCompletionService) {}

  /** Whether chat mode can use a cloud model in this workspace. */
  @Get('status')
  status(@WorkspaceId() workspaceId: string) {
    return this.chatCompletionService.isConfigured(workspaceId);
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  complete(@WorkspaceId() workspaceId: string, @Body() body: CreateChatCompletionDto) {
    return this.chatCompletionService.complete(workspaceId, body.messages);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CustomTableCommentsService } from './custom-table-comments.service';
import { CreateRowCommentDto, SetCommentResolvedDto } from './dto/create-row-comment.dto';

@Controller('custom-tables')
@UseGuards(JwtAuthGuard)
export class CustomTableCommentsController {
  constructor(private readonly commentsService: CustomTableCommentsService) {}

  @Get(':id/rows/:rowId/comments')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async listComments(
    @CurrentUser() _user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Param('rowId', new ParseUUIDPipe()) rowId: string,
  ) {
    const items = await this.commentsService.listComments(workspaceId, tableId, rowId);
    return { items };
  }

  @Post(':id/rows/:rowId/comments')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async addComment(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
    @Param('rowId', new ParseUUIDPipe()) rowId: string,
    @Body() dto: CreateRowCommentDto,
  ) {
    return this.commentsService.addComment(user.id, workspaceId, tableId, rowId, dto.body);
  }

  @Get(':id/comment-counts')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async countComments(
    @CurrentUser() _user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) tableId: string,
  ) {
    const counts = await this.commentsService.countOpenByRow(workspaceId, tableId);
    return { counts };
  }

  @Patch(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async setResolved(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) _tableId: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Body() dto: SetCommentResolvedDto,
  ) {
    return this.commentsService.setResolved(user.id, workspaceId, commentId, dto.resolved);
  }

  @Delete(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard)
  async deleteComment(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Param('id', new ParseUUIDPipe()) _tableId: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
  ) {
    await this.commentsService.deleteComment(user.id, workspaceId, commentId);
    return { message: 'Comment deleted' };
  }
}

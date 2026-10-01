import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApproveTransactionsDto,
  ResolveDuplicateDto,
  ReviewInboxQueryDto,
} from './dto/review-inbox.dto';
import { ReviewInboxService } from './review-inbox.service';

@Controller('review-inbox')
export class ReviewInboxController {
  constructor(private readonly reviewInboxService: ReviewInboxService) {}

  @Get()
  @WorkspaceAuth(Permission.TRANSACTION_VIEW)
  async list(
    @CurrentUser() _user: User,
    @WorkspaceId() workspaceId: string,
    @Query() query: ReviewInboxQueryDto,
  ) {
    return this.reviewInboxService.list(workspaceId, query);
  }

  @Get('counts')
  @WorkspaceAuth(Permission.TRANSACTION_VIEW)
  async counts(@CurrentUser() _user: User, @WorkspaceId() workspaceId: string) {
    return this.reviewInboxService.counts(workspaceId);
  }

  @Post('transactions/approve')
  @HttpCode(HttpStatus.OK)
  @WorkspaceAuth(Permission.TRANSACTION_EDIT)
  async approveTransactions(
    @Body() body: ApproveTransactionsDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.reviewInboxService.approveTransactions(
      workspaceId,
      user.id,
      body.ids,
      body.categoryId,
    );
  }

  @Post('duplicates/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @WorkspaceAuth(Permission.TRANSACTION_EDIT)
  async resolveDuplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ResolveDuplicateDto,
    @CurrentUser() _user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.reviewInboxService.resolveDuplicate(workspaceId, id, body.decision);
  }
}

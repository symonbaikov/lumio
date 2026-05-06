import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { SubscriptionStatus } from '../../entities/subscription.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../../entities/user.entity';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @WorkspaceAuth(Permission.SUBSCRIPTION_VIEW)
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query('status') status?: SubscriptionStatus,
  ) {
    return this.subscriptionsService.findAll(workspaceId, status);
  }

  @Get('summary')
  @WorkspaceAuth(Permission.SUBSCRIPTION_VIEW)
  async getSummary(@WorkspaceId() workspaceId: string) {
    return this.subscriptionsService.getSummary(workspaceId);
  }

  @Get('upcoming')
  @WorkspaceAuth(Permission.SUBSCRIPTION_VIEW)
  async getUpcoming(@WorkspaceId() workspaceId: string, @Query('days') days?: string) {
    return this.subscriptionsService.getUpcoming(workspaceId, days ? parseInt(days, 10) : 7);
  }

  @Get(':id')
  @WorkspaceAuth(Permission.SUBSCRIPTION_VIEW)
  async findOne(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.subscriptionsService.findOne(id, workspaceId);
  }

  @Post()
  @WorkspaceAuth(Permission.SUBSCRIPTION_CREATE)
  async create(
    @Body() dto: CreateSubscriptionDto,
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: User,
  ) {
    return this.subscriptionsService.create(workspaceId, user.id, dto);
  }

  @Put(':id')
  @WorkspaceAuth(Permission.SUBSCRIPTION_EDIT)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.subscriptionsService.update(id, workspaceId, dto);
  }

  @Post(':id/confirm')
  @WorkspaceAuth(Permission.SUBSCRIPTION_EDIT)
  async confirm(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.subscriptionsService.confirm(id, workspaceId);
  }

  @Post(':id/dismiss')
  @WorkspaceAuth(Permission.SUBSCRIPTION_EDIT)
  async dismiss(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    await this.subscriptionsService.dismiss(id, workspaceId);
  }

  @Delete(':id')
  @WorkspaceAuth(Permission.SUBSCRIPTION_DELETE)
  async remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    await this.subscriptionsService.remove(id, workspaceId);
  }
}

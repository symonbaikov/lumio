import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { deletedResponse } from '../../common/utils/responses.util';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { CreateGoalItemDto } from './dto/create-goal-item.dto';
import { GoalFlowQueryDto } from './dto/goal-flow-query.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { UpdateGoalItemDto } from './dto/update-goal-item.dto';
import { GoalFlowService } from './goal-flow.service';
import { GoalItemsService } from './goal-items.service';
import { GoalPlanService } from './goal-plan.service';
import { GoalsService } from './goals.service';

@Controller('goals')
export class GoalsController {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly goalFlowService: GoalFlowService,
    private readonly goalItemsService: GoalItemsService,
    private readonly goalPlanService: GoalPlanService,
  ) {}

  @Post()
  @WorkspaceAuth(Permission.GOAL_CREATE)
  async create(
    @Body() createDto: CreateGoalDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.goalsService.create(workspaceId, user.id, createDto);
  }

  @Get()
  @WorkspaceAuth(Permission.GOAL_VIEW)
  async findAll(@WorkspaceId() workspaceId: string) {
    return this.goalsService.findAll(workspaceId);
  }

  /**
   * Plan versus actual for one goal. Reads budget limits as well as spending,
   * so it asks for both permissions; the guard requires all of them.
   */
  @Get(':id/flow')
  @WorkspaceAuth(Permission.GOAL_VIEW, Permission.BUDGET_VIEW)
  async getFlow(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Query() query: GoalFlowQueryDto,
  ) {
    return this.goalFlowService.getFlow(id, workspaceId, query.month);
  }

  /**
   * Whether the goal is reachable, and on what terms. Reads budget limits to
   * work out free cash flow, so it asks for both permissions.
   */
  @Get(':id/plan')
  @WorkspaceAuth(Permission.GOAL_VIEW, Permission.BUDGET_VIEW)
  async getPlan(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.goalPlanService.getPlan(id, workspaceId);
  }

  /** The goal's cost breakdown: what the move is made of, line by line. */
  @Get(':id/items')
  @WorkspaceAuth(Permission.GOAL_VIEW)
  async listItems(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.goalItemsService.list(id, workspaceId);
  }

  @Post(':id/items')
  @WorkspaceAuth(Permission.GOAL_EDIT)
  async createItem(
    @Param('id') id: string,
    @Body() itemDto: CreateGoalItemDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.goalItemsService.create(id, workspaceId, user.id, itemDto);
  }

  @Patch(':id/items/:itemId')
  @WorkspaceAuth(Permission.GOAL_EDIT)
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() itemDto: UpdateGoalItemDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.goalItemsService.update(id, itemId, workspaceId, itemDto);
  }

  @Delete(':id/items/:itemId')
  @WorkspaceAuth(Permission.GOAL_EDIT)
  async removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.goalItemsService.remove(id, itemId, workspaceId);
  }

  @Get(':id')
  @WorkspaceAuth(Permission.GOAL_VIEW)
  async findOne(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.goalsService.findOne(id, workspaceId);
  }

  @Put(':id')
  @WorkspaceAuth(Permission.GOAL_EDIT)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateGoalDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.goalsService.update(id, workspaceId, updateDto);
  }

  @Delete(':id')
  @WorkspaceAuth(Permission.GOAL_DELETE)
  async remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    await this.goalsService.remove(id, workspaceId);
    return deletedResponse('Goal');
  }

  @Post(':id/contributions')
  @WorkspaceAuth(Permission.GOAL_EDIT)
  async addContribution(
    @Param('id') id: string,
    @Body() contributionDto: CreateContributionDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.goalsService.addContribution(id, workspaceId, user.id, contributionDto);
  }

  @Delete(':id/contributions/:contributionId')
  @WorkspaceAuth(Permission.GOAL_EDIT)
  async removeContribution(
    @Param('id') id: string,
    @Param('contributionId') contributionId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.goalsService.removeContribution(id, contributionId, workspaceId);
  }
}

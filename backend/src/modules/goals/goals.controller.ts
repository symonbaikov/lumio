import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { deletedResponse } from '../../common/utils/responses.util';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalsService } from './goals.service';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

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

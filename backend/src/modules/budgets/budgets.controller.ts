import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { deletedResponse } from '../../common/utils/responses.util';
import type { User } from '../../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @WorkspaceAuth(Permission.BUDGET_CREATE)
  async create(
    @Body() createDto: CreateBudgetDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.budgetsService.create(workspaceId, user.id, createDto);
  }

  @Get()
  @WorkspaceAuth(Permission.BUDGET_VIEW)
  async findAll(@WorkspaceId() workspaceId: string) {
    return this.budgetsService.findAll(workspaceId);
  }

  @Get(':id')
  @WorkspaceAuth(Permission.BUDGET_VIEW)
  async findOne(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.budgetsService.findOne(id, workspaceId);
  }

  @Put(':id')
  @WorkspaceAuth(Permission.BUDGET_EDIT)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBudgetDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.budgetsService.update(id, workspaceId, updateDto);
  }

  @Delete(':id')
  @WorkspaceAuth(Permission.BUDGET_DELETE)
  async remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    await this.budgetsService.remove(id, workspaceId);
    return deletedResponse('Budget');
  }
}

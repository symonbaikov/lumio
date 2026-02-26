import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { EntityType } from '../../entities/audit-event.entity';
import type { CategoryType } from '../../entities/category.entity';
import type { User } from '../../entities/user.entity';
import { Audit } from '../audit/decorators/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_CREATE)
  @Audit({ entityType: EntityType.CATEGORY, includeDiff: true, isUndoable: true })
  async create(
    @Body() createDto: CreateCategoryDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.categoriesService.create(workspaceId, user.id, createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_VIEW)
  async findAll(
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
    @Query('type') type?: CategoryType,
  ) {
    return this.categoriesService.findAll(workspaceId, type);
  }

  @Get('usage/counts')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_VIEW)
  async getWorkspaceUsageCounts(@WorkspaceId() workspaceId: string) {
    return this.categoriesService.getWorkspaceCategoryUsageCounts(workspaceId);
  }

  @Get(':id/usage-count')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_VIEW)
  async getUsageCount(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.categoriesService.getCategoryUsageCount(id, workspaceId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_VIEW)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.categoriesService.findOne(id, workspaceId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_EDIT)
  @Audit({ entityType: EntityType.CATEGORY, includeDiff: true, isUndoable: true })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCategoryDto,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.categoriesService.update(id, workspaceId, user.id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_DELETE)
  @Audit({ entityType: EntityType.CATEGORY, includeDiff: true, isUndoable: true })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @WorkspaceId() workspaceId: string,
  ) {
    await this.categoriesService.remove(id, workspaceId, user.id);
    return { message: 'Category deleted successfully' };
  }
}

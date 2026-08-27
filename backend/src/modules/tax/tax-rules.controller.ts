import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { deletedResponse } from '../../common/utils/responses.util';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { UpdateTaxRuleDto } from './dto/update-tax-rule.dto';
import { TaxRulesService } from './tax-rules.service';

@Controller('tax/rules')
export class TaxRulesController {
  constructor(private readonly taxRulesService: TaxRulesService) {}

  @Get()
  @WorkspaceAuth(Permission.CATEGORY_VIEW)
  async findAll(@WorkspaceId() workspaceId: string) {
    return this.taxRulesService.findAll(workspaceId);
  }

  @Get(':id')
  @WorkspaceAuth(Permission.CATEGORY_VIEW)
  async findOne(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.taxRulesService.findOne(id, workspaceId);
  }

  // Rules decide how money is taxed, not how it is labelled, so they sit
  // behind settings management rather than category permissions.
  @Post()
  @WorkspaceAuth(Permission.WORKSPACE_SETTINGS_MANAGE)
  async create(@Body() dto: CreateTaxRuleDto, @WorkspaceId() workspaceId: string) {
    return this.taxRulesService.create(workspaceId, dto);
  }

  @Put(':id')
  @WorkspaceAuth(Permission.WORKSPACE_SETTINGS_MANAGE)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaxRuleDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.taxRulesService.update(id, workspaceId, dto);
  }

  @Delete(':id')
  @WorkspaceAuth(Permission.WORKSPACE_SETTINGS_MANAGE)
  async remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    await this.taxRulesService.remove(id, workspaceId);
    return deletedResponse('Tax rule');
  }
}

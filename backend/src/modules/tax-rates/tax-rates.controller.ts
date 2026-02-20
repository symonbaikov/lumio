import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { WorkspaceContextGuard } from '../../common/guards/workspace-context.guard';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';
import { TaxRatesService } from './tax-rates.service';

@Controller('tax-rates')
@UseGuards(JwtAuthGuard)
export class TaxRatesController {
  constructor(private readonly taxRatesService: TaxRatesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_VIEW)
  async findAll(@WorkspaceId() workspaceId: string) {
    return this.taxRatesService.findAll(workspaceId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_VIEW)
  async findOne(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.taxRatesService.findOne(id, workspaceId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_CREATE)
  async create(@Body() createDto: CreateTaxRateDto, @WorkspaceId() workspaceId: string) {
    return this.taxRatesService.create(workspaceId, createDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_EDIT)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTaxRateDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.taxRatesService.update(id, workspaceId, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, WorkspaceContextGuard, PermissionsGuard)
  @RequirePermission(Permission.CATEGORY_DELETE)
  async remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    await this.taxRatesService.remove(id, workspaceId);
    return { message: 'Tax rate deleted successfully' };
  }
}

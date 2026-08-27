import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { WorkspaceAuth } from '../../common/decorators/workspace-auth.decorator';
import { WorkspaceId } from '../../common/decorators/workspace.decorator';
import { Permission } from '../../common/enums/permissions.enum';
import { deletedResponse } from '../../common/utils/responses.util';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';
import { TaxRatesService } from './tax-rates.service';

@Controller('tax-rates')
export class TaxRatesController {
  constructor(private readonly taxRatesService: TaxRatesService) {}

  @Get()
  @WorkspaceAuth(Permission.CATEGORY_VIEW)
  async findAll(@WorkspaceId() workspaceId: string) {
    return this.taxRatesService.findAll(workspaceId);
  }

  @Get(':id')
  @WorkspaceAuth(Permission.CATEGORY_VIEW)
  async findOne(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.taxRatesService.findOne(id, workspaceId);
  }

  @Post()
  @WorkspaceAuth(Permission.CATEGORY_CREATE)
  async create(@Body() createDto: CreateTaxRateDto, @WorkspaceId() workspaceId: string) {
    return this.taxRatesService.create(workspaceId, createDto);
  }

  @Put(':id')
  @WorkspaceAuth(Permission.CATEGORY_EDIT)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTaxRateDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.taxRatesService.update(id, workspaceId, updateDto);
  }

  @Delete(':id')
  @WorkspaceAuth(Permission.CATEGORY_DELETE)
  async remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    await this.taxRatesService.remove(id, workspaceId);
    return deletedResponse('Tax rate');
  }
}

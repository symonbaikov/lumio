import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { CreateWorkspaceDto } from './create-workspace.dto';
import { WorkspaceProcessingDto } from './workspace-processing.dto';

export class UpdateWorkspaceDto extends PartialType(CreateWorkspaceDto) {
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  /** How this workspace categorises and de-duplicates incoming data. */
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkspaceProcessingDto)
  processing?: WorkspaceProcessingDto;
}

import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  type WorkspaceProfile,
  workspaceProfiles,
} from '../../../common/utils/workspace-profile.util';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @IsString()
  @IsOptional()
  @MaxLength(7)
  color?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  backgroundImage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  /** Home hides the business pages from the navigation; business is the default. */
  @IsIn(workspaceProfiles)
  @IsOptional()
  profile?: WorkspaceProfile;
}

import { IsEnum } from 'class-validator';
import { WorkspaceRole } from '../../../entities';

export class UpdateMemberRoleDto {
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}

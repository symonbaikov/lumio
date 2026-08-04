import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceContextGuard } from './guards/workspace-context.guard';
import { OpenRouterService } from './services/openrouter.service';
import { WorkspaceCurrencyService } from './services/workspace-currency.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceMember, Workspace])],
  providers: [WorkspaceContextGuard, OpenRouterService, WorkspaceCurrencyService],
  exports: [WorkspaceContextGuard, OpenRouterService, WorkspaceCurrencyService],
})
export class CommonModule {}

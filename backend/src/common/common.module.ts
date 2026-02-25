import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { WorkspaceContextGuard } from './guards/workspace-context.guard';
import { OpenRouterService } from './services/openrouter.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceMember])],
  providers: [WorkspaceContextGuard, OpenRouterService],
  exports: [WorkspaceContextGuard, OpenRouterService],
})
export class CommonModule {}

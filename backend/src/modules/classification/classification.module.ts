import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch, User, WorkspaceMember } from '../../entities';
import { Workspace } from '../../entities/workspace.entity';
import { CategorizationRule } from '../../entities/categorization-rule.entity';
import { CategoryLearning } from '../../entities/category-learning.entity';
import { Category } from '../../entities/category.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Wallet } from '../../entities/wallet.entity';
import { ApplicationSettingsModule } from '../application-settings/application-settings.module';
import { AuditModule } from '../audit/audit.module';
import { CategoriesModule } from '../categories/categories.module';
import { CategorizationRulesController } from './categorization-rules.controller';
import { ClassificationController } from './classification.controller';
import { ClassificationService } from './services/classification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      CategoryLearning,
      Branch,
      Wallet,
      Transaction,
      CategorizationRule,
      WorkspaceMember,
      Workspace,
      User,
    ]),
    AuditModule,
    ApplicationSettingsModule,
    CategoriesModule,
  ],
  controllers: [ClassificationController, CategorizationRulesController],
  providers: [ClassificationService],
  exports: [ClassificationService],
})
export class ClassificationModule {}

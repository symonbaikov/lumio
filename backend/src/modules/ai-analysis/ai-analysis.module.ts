import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiChat, AiChatMessage, Transaction, TransactionEmbedding } from '../../entities';
import { ApplicationSettingsModule } from '../application-settings/application-settings.module';
import { InsightsModule } from '../insights/insights.module';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { AiInsightsController } from './ai-insights.controller';
import { ChatCompletionController } from './chat-completion.controller';
import { ChatCompletionService } from './chat-completion.service';
import { ModelProxyController } from './model-proxy.controller';
import { ModelProxyService } from './model-proxy.service';
import { TextEmbeddingService } from './text-embedding.service';
import { TransactionSearchController } from './transaction-search.controller';
import { TransactionSearchService } from './transaction-search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiChat, AiChatMessage, Transaction, TransactionEmbedding]),
    InsightsModule,
    ApplicationSettingsModule,
  ],
  controllers: [
    ModelProxyController,
    AiChatController,
    TransactionSearchController,
    AiInsightsController,
    ChatCompletionController,
  ],
  providers: [
    ModelProxyService,
    AiChatService,
    TextEmbeddingService,
    TransactionSearchService,
    ChatCompletionService,
  ],
  exports: [ModelProxyService, AiChatService, TransactionSearchService],
})
export class AiAnalysisModule {}

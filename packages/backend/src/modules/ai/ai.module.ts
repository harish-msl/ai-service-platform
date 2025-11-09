import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiGateway } from './ai.gateway';
import { QueryGenerationService } from './services/query-generation.service';
import { ChatbotService } from './services/chatbot.service';
import { AnalyticsService } from './services/analytics.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WeaviateModule } from '../weaviate/weaviate.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [PrismaModule, WeaviateModule, ApiKeysModule, ProjectsModule],
  controllers: [AiController],
  providers: [
    AiGateway,
    QueryGenerationService,
    ChatbotService,
    AnalyticsService,
  ],
  exports: [QueryGenerationService, ChatbotService, AnalyticsService],
})
export class AiModule {}

import { Module } from '@nestjs/common';
import { WeaviateController } from './weaviate.controller';
import { WeaviateService } from './weaviate.service';
import { RagService } from './rag.service';

@Module({
  controllers: [WeaviateController],
  providers: [WeaviateService, RagService],
  exports: [WeaviateService, RagService],
})
export class WeaviateModule {}

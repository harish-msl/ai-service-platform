import { Module } from '@nestjs/common';
import { WeaviateController } from './weaviate.controller';
import { WeaviateService } from './weaviate.service';

@Module({
  controllers: [WeaviateController],
  providers: [WeaviateService],
  exports: [WeaviateService],
})
export class WeaviateModule {}

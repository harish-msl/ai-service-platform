import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SchemaController } from './schema.controller';
import { SchemaService } from './schema.service';
import { SchemaIndexingProcessor } from './schema-indexing.processor';
import { PrismaModule } from '../../prisma/prisma.module';
import { WeaviateModule } from '../weaviate/weaviate.module';

@Module({
  imports: [
    PrismaModule,
    WeaviateModule,
    BullModule.registerQueue({
      name: 'schema-indexing',
    }),
  ],
  controllers: [SchemaController],
  providers: [SchemaService, SchemaIndexingProcessor],
  exports: [SchemaService],
})
export class SchemaModule {}

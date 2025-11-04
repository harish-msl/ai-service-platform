import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { WeaviateService } from '../weaviate/weaviate.service';

interface SchemaIndexingJob {
  projectId: string;
  projectName: string;
  schemaText: string;
  schemaSummary: string;
}

@Processor('schema-indexing')
export class SchemaIndexingProcessor {
  private readonly logger = new Logger(SchemaIndexingProcessor.name);

  constructor(private readonly weaviateService: WeaviateService) {}

  @Process('index-schema')
  async handleSchemaIndexing(job: Job<SchemaIndexingJob>) {
    const { projectId, projectName, schemaText, schemaSummary } = job.data;

    this.logger.log(`Processing schema indexing job for project ${projectId} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts || 3})`);

    try {
      const result = await Promise.race([
        this.weaviateService.indexProjectSchema(
          projectId,
          projectName,
          schemaText,
          schemaSummary,
        ),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Indexing timeout after 30s')), 30000)
        ),
      ]);

      this.logger.log(`Successfully indexed schema for project ${projectId} in Weaviate`);
      return { success: true, projectId, result };
    } catch (error) {
      const errorMessage = error?.message || String(error);
      this.logger.warn(
        `Failed to index schema for project ${projectId} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts || 3}): ${errorMessage}`,
      );

      // Check if we should retry
      if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
        this.logger.error(`Giving up on indexing for project ${projectId} after ${job.opts.attempts || 3} attempts`);
        // Don't throw on final attempt - just log and complete
        return { success: false, projectId, error: errorMessage };
      }

      // Throw error to trigger Bull retry mechanism
      throw error;
    }
  }
}

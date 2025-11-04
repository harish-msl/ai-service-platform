import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Embeddings } from '@langchain/core/embeddings';
import { HuggingFaceEmbeddings } from './huggingface-embeddings';

export interface DocumentMetadata {
  projectId: string;
  projectName: string;
  type: 'schema' | 'conversation' | 'query' | 'documentation';
  createdAt: string;
  [key: string]: any;
}

export interface IndexDocumentInput {
  projectId: string;
  content: string;
  metadata: DocumentMetadata;
  collectionName?: string;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  score: number;
  distance: number;
}

@Injectable()
export class WeaviateService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WeaviateService.name);
  private client: WeaviateClient;
  private embeddings: Embeddings;
  private readonly defaultCollection = 'AIServicePlatform';
  private isAvailable = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Initialize Weaviate client
      const weaviateUrl = this.configService.get('WEAVIATE_URL') || 'http://localhost:8080';
      const weaviateApiKey = this.configService.get('WEAVIATE_API_KEY');

      this.client = weaviate.client({
        scheme: weaviateUrl.startsWith('https') ? 'https' : 'http',
        host: weaviateUrl.replace(/^https?:\/\//, ''),
        apiKey: weaviateApiKey ? new ApiKey(weaviateApiKey) : undefined,
      });

      // Initialize embeddings based on configuration
      const vllmBaseUrl = this.configService.get('VLLM_BASE_URL') || 'http://localhost:8000';
      
      if (vllmBaseUrl.includes('/v1')) {
        // GPU vLLM with OpenAI-compatible API
        this.logger.log('Initializing GPU embeddings (vLLM OpenAI-compatible)');
        this.embeddings = new OpenAIEmbeddings({
          modelName: 'BAAI/bge-small-en-v1.5',
          openAIApiKey: 'EMPTY',
          configuration: {
            baseURL: vllmBaseUrl,
            apiKey: 'EMPTY',
          },
        });
      } else {
        // CPU Hugging Face Text Embeddings Inference
        this.logger.log('Initializing CPU embeddings (Hugging Face TEI)');
        this.embeddings = new HuggingFaceEmbeddings({
          apiUrl: vllmBaseUrl,
          model: 'BAAI/bge-small-en-v1.5',
        });
      }

      // Check connection (with timeout)
      await Promise.race([
        this.checkConnection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Weaviate connection timeout')), 5000)
        ),
      ]);

      // Create schema if not exists
      await this.ensureSchema();

      this.isAvailable = true;
      this.logger.log('Weaviate service initialized successfully');
    } catch (error) {
      this.isAvailable = false;
      this.logger.warn('Failed to initialize Weaviate service (will continue without vector search):', error.message);
      // Don't throw - allow app to start without Weaviate
    }
  }

  async onModuleDestroy() {
    this.logger.log('Weaviate service shutting down');
  }

  private async checkConnection(): Promise<boolean> {
    try {
      const meta = await this.client.misc.metaGetter().do();
      this.logger.log(`Connected to Weaviate version: ${meta.version}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to Weaviate:', error);
      throw new Error('Weaviate connection failed');
    }
  }

  private async ensureSchema() {
    try {
      // Check if class exists
      const schema = await this.client.schema.getter().do();
      const classExists = schema.classes?.some((cls: any) => cls.class === this.defaultCollection);

      if (!classExists) {
        // Create class
        await this.client.schema
          .classCreator()
          .withClass({
            class: this.defaultCollection,
            description: 'AI Service Platform knowledge base',
            vectorizer: 'none', // We'll provide vectors manually
            properties: [
              {
                name: 'content',
                dataType: ['text'],
                description: 'Document content',
              },
              {
                name: 'projectId',
                dataType: ['text'],
                description: 'Project ID',
              },
              {
                name: 'projectName',
                dataType: ['text'],
                description: 'Project name',
              },
              {
                name: 'type',
                dataType: ['text'],
                description: 'Document type (schema, conversation, query, documentation)',
              },
              {
                name: 'metadata',
                dataType: ['text'],
                description: 'Additional metadata as JSON string',
              },
              {
                name: 'createdAt',
                dataType: ['text'],
                description: 'Creation timestamp',
              },
            ],
          })
          .do();

        this.logger.log(`Created Weaviate class: ${this.defaultCollection}`);
      }
    } catch (error) {
      this.logger.error('Failed to ensure schema:', error);
      throw error;
    }
  }

  async indexDocument(input: IndexDocumentInput): Promise<string> {
    if (!this.isAvailable) {
      this.logger.warn('Weaviate is not available. Skipping document indexing.');
      return '';
    }

    try {
      const { projectId, content, metadata, collectionName } = input;

      // Generate embeddings with timeout
      let vector: number[];
      try {
        vector = await Promise.race([
          this.embeddings.embedQuery(content),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Embedding generation timeout')), 10000)
          ),
        ]);
      } catch (embedError) {
        this.logger.warn(`Failed to generate embeddings, skipping indexing: ${embedError.message}`);
        return '';
      }

      // Create object
      const result = await this.client.data
        .creator()
        .withClassName(collectionName || this.defaultCollection)
        .withProperties({
          content,
          projectId,
          projectName: metadata.projectName,
          type: metadata.type,
          metadata: JSON.stringify(metadata),
          createdAt: metadata.createdAt || new Date().toISOString(),
        })
        .withVector(vector)
        .do();

      const documentId = result.id || '';
      this.logger.log(`Indexed document: ${documentId} for project ${projectId}`);
      return documentId;
    } catch (error) {
      this.logger.error('Failed to index document:', error.message);
      throw error;
    }
  }

  async indexMultipleDocuments(inputs: IndexDocumentInput[]): Promise<string[]> {
    const ids: string[] = [];

    for (const input of inputs) {
      try {
        const id = await this.indexDocument(input);
        ids.push(id);
      } catch (error) {
        this.logger.error(`Failed to index document for project ${input.projectId}:`, error);
      }
    }

    return ids;
  }

  async semanticSearch(
    query: string,
    projectId?: string,
    limit: number = 5,
    type?: string,
  ): Promise<SearchResult[]> {
    try {
      // Generate query embedding
      const queryVector = await this.embeddings.embedQuery(query);

      // Build search query
      let searchQuery = this.client.graphql
        .get()
        .withClassName(this.defaultCollection)
        .withNearVector({ vector: queryVector })
        .withLimit(limit)
        .withFields('content projectId projectName type metadata createdAt _additional { id distance }');

      // Add filters if provided
      if (projectId || type) {
        const filters: any = { operator: 'And', operands: [] };

        if (projectId) {
          filters.operands.push({
            path: ['projectId'],
            operator: 'Equal',
            valueText: projectId,
          });
        }

        if (type) {
          filters.operands.push({
            path: ['type'],
            operator: 'Equal',
            valueText: type,
          });
        }

        searchQuery = searchQuery.withWhere(filters);
      }

      const result = await searchQuery.do();

      // Parse results
      const results: SearchResult[] = (result.data.Get[this.defaultCollection] || []).map((item: any) => ({
        id: item._additional.id,
        content: item.content,
        metadata: JSON.parse(item.metadata || '{}'),
        score: 1 - item._additional.distance, // Convert distance to similarity score
        distance: item._additional.distance,
      }));

      this.logger.log(`Semantic search found ${results.length} results for query: "${query.substring(0, 50)}..."`);
      return results;
    } catch (error) {
      this.logger.error('Semantic search failed:', error);
      return [];
    }
  }

  async getDocumentById(id: string): Promise<SearchResult | null> {
    try {
      const result = await this.client.data
        .getterById()
        .withClassName(this.defaultCollection)
        .withId(id)
        .do();

      if (!result || !result.properties) {
        return null;
      }

      return {
        id: result.id || id,
        content: (result.properties.content as string) || '',
        metadata: JSON.parse((result.properties.metadata as string) || '{}'),
        score: 1,
        distance: 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get document ${id}:`, error);
      return null;
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      await this.client.data.deleter().withClassName(this.defaultCollection).withId(id).do();

      this.logger.log(`Deleted document: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete document ${id}:`, error);
      return false;
    }
  }

  async deleteProjectDocuments(projectId: string): Promise<number> {
    try {
      const result = await this.client.batch
        .objectsBatchDeleter()
        .withClassName(this.defaultCollection)
        .withWhere({
          path: ['projectId'],
          operator: 'Equal',
          valueText: projectId,
        })
        .do();

      const deletedCount = result.results?.successful || 0;
      this.logger.log(`Deleted ${deletedCount} documents for project ${projectId}`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to delete documents for project ${projectId}:`, error);
      return 0;
    }
  }

  async getRelevantContext(query: string, projectId: string, maxTokens: number = 2000): Promise<string> {
    // Search for relevant documents
    const results = await this.semanticSearch(query, projectId, 10);

    if (results.length === 0) {
      return '';
    }

    // Combine results into context, respecting token limit (rough estimate: 4 chars = 1 token)
    const maxChars = maxTokens * 4;
    let context = '';
    let currentLength = 0;

    for (const result of results) {
      const addition = `\n\n--- ${result.metadata.type} (relevance: ${(result.score * 100).toFixed(1)}%) ---\n${result.content}`;

      if (currentLength + addition.length > maxChars) {
        break;
      }

      context += addition;
      currentLength += addition.length;
    }

    return context.trim();
  }

  async indexProjectSchema(projectId: string, projectName: string, schemaText: string, schemaSummary: string) {
    const documents: IndexDocumentInput[] = [
      // Index full schema
      {
        projectId,
        content: `Database Schema for ${projectName}:\n\n${schemaText}`,
        metadata: {
          projectId,
          projectName,
          type: 'schema',
          subType: 'full',
          createdAt: new Date().toISOString(),
        },
      },
      // Index schema summary
      {
        projectId,
        content: `Schema Summary for ${projectName}:\n\n${schemaSummary}`,
        metadata: {
          projectId,
          projectName,
          type: 'schema',
          subType: 'summary',
          createdAt: new Date().toISOString(),
        },
      },
    ];

    // Split schema into table chunks for better retrieval
    const tableMatches = schemaText.matchAll(/CREATE TABLE (\w+)[^;]+;/gi);
    for (const match of tableMatches) {
      documents.push({
        projectId,
        content: `Table definition:\n${match[0]}`,
        metadata: {
          projectId,
          projectName,
          type: 'schema',
          subType: 'table',
          tableName: match[1],
          createdAt: new Date().toISOString(),
        },
      });
    }

    return this.indexMultipleDocuments(documents);
  }

  async getStats() {
    try {
      const result = await this.client.graphql
        .aggregate()
        .withClassName(this.defaultCollection)
        .withFields('meta { count }')
        .do();

      const count = result.data.Aggregate[this.defaultCollection]?.[0]?.meta?.count || 0;

      return {
        totalDocuments: count,
        className: this.defaultCollection,
        isHealthy: true,
      };
    } catch (error) {
      this.logger.error('Failed to get stats:', error);
      return {
        totalDocuments: 0,
        className: this.defaultCollection,
        isHealthy: false,
      };
    }
  }
}

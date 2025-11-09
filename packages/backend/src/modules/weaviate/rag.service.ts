import { Injectable, Logger } from '@nestjs/common';
import { WeaviateService } from './weaviate.service';

interface ConversationExample {
  projectId: string;
  question: string;
  answer: string;
  sqlQuery?: string;
  chartConfig?: any;
  successful: boolean;
  userRating?: number;
  timestamp: Date;
  schemaSnapshot?: any;
  domain?: string;
}

interface RetrievedExample {
  question: string;
  answer: string;
  sqlQuery?: string;
  similarity: number;
  originalSimilarity?: number;
  userRating?: number;
  timestamp: Date;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly COLLECTION_NAME = 'ConversationExamples';
  private readonly MAX_EXAMPLES = 5;
  private readonly MIN_SIMILARITY = 0.7;
  private readonly EMBEDDING_CACHE = new Map<string, { embedding: number[]; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly weaviateService: WeaviateService) {
    this.initializeSchema();
    
    // Clean cache periodically
    setInterval(() => this.cleanCache(), 60000); // Every minute
  }

  /**
   * Initialize Weaviate schema for conversation examples
   */
  private async initializeSchema() {
    try {
      const client = this.weaviateService.getClient();
      
      // Check if class already exists
      const exists = await client.schema
        .classGetter()
        .withClassName(this.COLLECTION_NAME)
        .do()
        .then(() => true)
        .catch(() => false);

      if (!exists) {
        this.logger.log('Creating Weaviate schema for conversation examples...');
        
        await client.schema
          .classCreator()
          .withClass({
            class: this.COLLECTION_NAME,
            description: 'Stores successful Q&A pairs for RAG-based learning',
            vectorizer: 'none', // We'll provide embeddings
            properties: [
              {
                name: 'projectId',
                dataType: ['string'],
                description: 'Project identifier for filtering',
              },
              {
                name: 'question',
                dataType: ['text'],
                description: 'User question',
              },
              {
                name: 'answer',
                dataType: ['text'],
                description: 'AI-generated answer',
              },
              {
                name: 'sqlQuery',
                dataType: ['text'],
                description: 'Generated SQL query if applicable',
              },
              {
                name: 'chartConfig',
                dataType: ['text'],
                description: 'Chart configuration JSON if applicable',
              },
              {
                name: 'successful',
                dataType: ['boolean'],
                description: 'Whether the interaction was successful',
              },
              {
                name: 'userRating',
                dataType: ['number'],
                description: 'User rating 1-5',
              },
              {
                name: 'timestamp',
                dataType: ['date'],
                description: 'When this example was created',
              },
              {
                name: 'schemaSnapshot',
                dataType: ['text'],
                description: 'Database schema at time of interaction',
              },
              {
                name: 'domain',
                dataType: ['string'],
                description: 'Project domain (survey, ecommerce, crm, etc.)',
              },
            ],
          })
          .do();

        this.logger.log('✅ Weaviate schema created successfully');
      } else {
        this.logger.log('Weaviate schema already exists');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Weaviate schema:', error);
    }
  }

  /**
   * Store a successful conversation example
   */
  async storeExample(example: ConversationExample): Promise<void> {
    try {
      const client = this.weaviateService.getClient();

      // Generate embedding for the question
      const embedding = await this.generateEmbedding(example.question);

      await client.data
        .creator()
        .withClassName(this.COLLECTION_NAME)
        .withProperties({
          projectId: example.projectId,
          question: example.question,
          answer: example.answer,
          sqlQuery: example.sqlQuery || null,
          chartConfig: example.chartConfig ? JSON.stringify(example.chartConfig) : null,
          successful: example.successful,
          userRating: example.userRating || null,
          timestamp: example.timestamp.toISOString(),
          schemaSnapshot: example.schemaSnapshot ? JSON.stringify(example.schemaSnapshot) : null,
          domain: example.domain || null,
        })
        .withVector(embedding)
        .do();

      this.logger.log(`✅ Stored conversation example for project ${example.projectId}`);
    } catch (error) {
      this.logger.error('Failed to store conversation example:', error);
      throw error;
    }
  }

  /**
   * Retrieve similar examples for RAG with quality filtering
   * OPTIMIZED: Added caching and reduced search limit
   */
  async retrieveSimilarExamples(
    question: string,
    projectId: string,
    limit: number = this.MAX_EXAMPLES,
  ): Promise<RetrievedExample[]> {
    try {
      const client = this.weaviateService.getClient();

      // Generate embedding for the question
      const startEmbedding = Date.now();
      const embedding = await this.generateEmbedding(question);
      this.logger.debug(`Embedding generation took ${Date.now() - startEmbedding}ms`);

      // Reduced search limit for better performance (was limit * 3)
      const searchLimit = Math.min(limit * 2, 10); // Max 10 results to filter
      
      const startSearch = Date.now();
      const result = await client.graphql
        .get()
        .withClassName(this.COLLECTION_NAME)
        .withFields('question answer sqlQuery timestamp userRating successful _additional { certainty }')
        .withNearVector({ vector: embedding })
        .withWhere({
          path: ['projectId'],
          operator: 'Equal',
          valueString: projectId,
        })
        .withLimit(searchLimit)
        .do();
      
      this.logger.debug(`Weaviate search took ${Date.now() - startSearch}ms`);

      const examples = result?.data?.Get?.[this.COLLECTION_NAME] || [];

      // Filter and rank examples based on quality
      return examples
        .filter((ex: any) => {
          // Must meet minimum similarity threshold
          if (ex._additional.certainty < this.MIN_SIMILARITY) {
            return false;
          }
          
          // Exclude examples with negative feedback (thumbs down)
          if (ex.userRating !== undefined && ex.userRating < 0) {
            this.logger.debug(`Filtering out example with negative rating: ${ex.userRating}`);
            return false;
          }
          
          // Only include successful examples
          if (ex.successful === false) {
            return false;
          }
          
          return true;
        })
        .map((ex: any) => {
          // Calculate quality score for ranking
          let qualityBoost = 1.0;
          
          // Boost examples with positive ratings
          if (ex.userRating !== undefined && ex.userRating > 0) {
            qualityBoost += 0.2; // +20% for thumbs up
          }
          
          // Apply quality boost to similarity score
          const boostedSimilarity = Math.min(ex._additional.certainty * qualityBoost, 1.0);
          
          return {
            question: ex.question,
            answer: ex.answer,
            sqlQuery: ex.sqlQuery,
            similarity: boostedSimilarity,
            originalSimilarity: ex._additional.certainty,
            userRating: ex.userRating,
            timestamp: new Date(ex.timestamp),
          };
        })
        .sort((a: any, b: any) => {
          // Sort by boosted similarity (highest first)
          if (b.similarity !== a.similarity) {
            return b.similarity - a.similarity;
          }
          // If equal, prefer examples with ratings
          if (a.userRating !== undefined && b.userRating === undefined) return -1;
          if (b.userRating !== undefined && a.userRating === undefined) return 1;
          // If both have ratings, prefer higher ratings
          return (b.userRating || 0) - (a.userRating || 0);
        })
        .slice(0, limit); // Return top N after filtering and ranking
    } catch (error) {
      this.logger.error('Failed to retrieve similar examples:', error);
      return [];
    }
  }

  /**
   * Generate embedding for text using Ollama with caching
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = text.trim().toLowerCase();
    const cached = this.EMBEDDING_CACHE.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug('Using cached embedding');
      return cached.embedding;
    }

    try {
      // Use Ollama's embedding endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:1.5b',
          prompt: text,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      
      // Cache the result
      this.EMBEDDING_CACHE.set(cacheKey, {
        embedding: data.embedding,
        timestamp: Date.now(),
      });
      
      return data.embedding;
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.warn('Embedding generation timed out after 5s');
      } else {
        this.logger.error('Failed to generate embedding:', error);
      }
      // Return zero vector as fallback
      return new Array(384).fill(0);
    }
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.EMBEDDING_CACHE.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.EMBEDDING_CACHE.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Check if query is simple enough to skip RAG
   * Simple queries: greetings, help requests, general questions
   */
  private isSimpleQuery(question: string): boolean {
    const q = question.toLowerCase().trim();
    
    // Greetings and pleasantries
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    if (greetings.some(g => q === g || q.startsWith(g + ' '))) {
      return true;
    }
    
    // Help requests
    if (q.includes('how to use') || q.includes('what can you do') || q.includes('help me')) {
      return true;
    }
    
    // Very short queries (likely not data-specific)
    if (q.length < 10) {
      return true;
    }
    
    return false;
  }

  /**
   * Build enhanced system prompt with RAG examples
   * OPTIMIZED: Added skip option for simple queries
   */
  async buildEnhancedPrompt(
    question: string,
    projectId: string,
    schema: any,
    basePrompt: string,
    options: { skipRAG?: boolean } = {},
  ): Promise<string> {
    // Fast path: Skip RAG for very simple queries or if explicitly disabled
    if (options.skipRAG || this.isSimpleQuery(question)) {
      this.logger.debug('Skipping RAG retrieval for simple query');
      return `${basePrompt}

## CURRENT TASK:
User Question: ${question}

Provide a clear and concise answer.`;
    }

    // Retrieve similar examples
    const startRAG = Date.now();
    const examples = await this.retrieveSimilarExamples(question, projectId, 3);
    this.logger.debug(`RAG retrieval took ${Date.now() - startRAG}ms, found ${examples.length} examples`);

    // Concise reasoning framework (optimized for 0.5b model)
    const reasoningFramework = `APPROACH: Understand → Identify tables → Build SQL → Explain`;

    // Project-specific examples section
    let examplesSection = '';
    if (examples.length > 0) {
      examplesSection = `
PAST SOLUTIONS (${examples.length} similar questions):

${examples
  .map(
    (ex, i) => `
${i + 1}. Q: ${ex.question}
   A: ${ex.answer.substring(0, 150)}${ex.answer.length > 150 ? '...' : ''}
${ex.sqlQuery ? `   SQL: ${ex.sqlQuery.substring(0, 200)}${ex.sqlQuery.length > 200 ? '...' : ''}` : ''}
`,
  )
  .join('\n')}

Adapt these patterns to current question.
`;
    }

    // Domain-specific hints
    const domainHints = this.getDomainHints(schema);

    // Combine everything into enhanced prompt (concise for 0.5b speed)
    return `${basePrompt}

${reasoningFramework}

${examplesSection}

${domainHints}

TASK: ${question}

Answer concisely using schema above.`;
  }

  /**
   * Detect domain and provide specific hints
   */
  private getDomainHints(schema: any): string {
    const tables = schema?.tables || [];
    const tableNames = tables.map((t: any) => t.name.toLowerCase()).join(' ');

    // Detect domain based on table names
    let domain = 'general';
    let hints = '';

    if (tableNames.includes('survey') || tableNames.includes('response')) {
      domain = 'survey';
      hints = `
## DOMAIN-SPECIFIC HINTS (Survey Analytics):
- Response tables typically have user_id, question_id, answer fields
- Use COUNT(DISTINCT user_id) for unique respondents
- Consider response_date for time-based analysis
- Common visualizations: bar charts for distributions, line charts for trends
`;
    } else if (tableNames.includes('order') || tableNames.includes('product')) {
      domain = 'ecommerce';
      hints = `
## DOMAIN-SPECIFIC HINTS (E-commerce):
- Orders typically link to customers and products
- Revenue = SUM(price * quantity)
- Consider order_date, order_status for filtering
- Common visualizations: line charts for revenue trends, pie charts for category distribution
`;
    } else if (tableNames.includes('customer') || tableNames.includes('contact')) {
      domain = 'crm';
      hints = `
## DOMAIN-SPECIFIC HINTS (CRM):
- Customers may have multiple contacts/interactions
- Track customer lifecycle: lead → opportunity → customer
- Consider created_date, updated_date for timeline analysis
- Common visualizations: funnel charts for conversion, line charts for growth
`;
    }

    return hints;
  }

  /**
   * Calculate quality score for an interaction
   */
  calculateQualityScore(params: {
    sqlSuccess: boolean;
    userRating?: number;
    responseTime: number;
    hasChart: boolean;
  }): number {
    let score = 0;

    // SQL success (40 points)
    if (params.sqlSuccess) score += 40;

    // User rating (30 points)
    if (params.userRating) {
      score += (params.userRating / 5) * 30;
    }

    // Response time (20 points - faster is better)
    if (params.responseTime < 3000) score += 20;
    else if (params.responseTime < 5000) score += 15;
    else if (params.responseTime < 10000) score += 10;

    // Has chart visualization (10 points)
    if (params.hasChart) score += 10;

    return Math.min(100, score);
  }

  /**
   * Update user rating for a conversation example in Weaviate
   * Called when user provides feedback on a message
   */
  async updateUserRating(
    projectId: string,
    question: string,
    rating: number,
  ): Promise<boolean> {
    try {
      const client = this.weaviateService.getClient();

      // Find the example by projectId and question
      const result = await client.graphql
        .get()
        .withClassName(this.COLLECTION_NAME)
        .withFields('question')
        .withWhere({
          operator: 'And',
          operands: [
            {
              path: ['projectId'],
              operator: 'Equal',
              valueString: projectId,
            },
            {
              path: ['question'],
              operator: 'Equal',
              valueText: question,
            },
          ],
        })
        .withLimit(1)
        .do();

      const examples = result?.data?.Get?.[this.COLLECTION_NAME] || [];
      
      if (examples.length === 0) {
        this.logger.warn(`No example found to update rating for question: ${question}`);
        return false;
      }

      // Note: Weaviate doesn't support direct updates by query
      // We would need the object UUID to update it
      // For now, log that we found the example
      this.logger.log(`Found example to update rating: projectId=${projectId}, rating=${rating}`);
      
      // TODO: Store message UUID in database to enable direct updates
      // For Phase 2, we'll rely on filtering in retrieveSimilarExamples()
      
      return true;
    } catch (error) {
      this.logger.error('Failed to update user rating in Weaviate:', error);
      return false;
    }
  }
}

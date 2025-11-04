import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { WeaviateService } from '../../weaviate/weaviate.service';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class QueryGenerationService {
  private readonly logger = new Logger(QueryGenerationService.name);
  private readonly llm: ChatOpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly weaviateService: WeaviateService,
  ) {
    // Initialize LLM with vLLM endpoint (OpenAI-compatible)
    this.llm = new ChatOpenAI({
      modelName: 'Qwen/Qwen2.5-Coder-32B-Instruct',
      temperature: 0.1,
      maxTokens: 2000,
      configuration: {
        baseURL: this.configService.get('VLLM_QWEN_CODER_URL') || 'http://localhost:8001/v1',
        apiKey: 'EMPTY', // vLLM doesn't require API key
      },
    });
  }

  async generateQuery(projectId: string, question: string, context?: string) {
    // Get project schema
    const schema = await this.prisma.projectSchema.findUnique({
      where: { projectId },
      include: {
        project: true,
      },
    });

    if (!schema) {
      throw new NotFoundException('No schema found for this project. Please upload or sync a schema first.');
    }

    // Create prompt for SQL generation
    const prompt = PromptTemplate.fromTemplate(`
You are an expert SQL developer. Generate a SQL query based on the user's question and the provided database schema.

Database Schema:
{schema}

Database Dialect: {dialect}

User Question: {question}

{contextSection}

Requirements:
1. Generate ONLY valid {dialect} SQL
2. Use proper table and column names from the schema
3. Add appropriate WHERE clauses, JOINs, and filters
4. Optimize for performance
5. Include helpful comments
6. Return ONLY the SQL query, no explanations

SQL Query:
`);

    const contextSection = context ? `Additional Context: ${context}` : '';

    try {
      const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

      const sqlQuery = await chain.invoke({
        schema: schema.schemaSummary,
        dialect: schema.dialect,
        question,
        contextSection,
      });

      // Clean up the generated SQL
      const cleanedQuery = this.cleanSqlQuery(sqlQuery);

      // Validate basic SQL structure
      this.validateSql(cleanedQuery);

      this.logger.log(`Generated SQL query for project ${projectId}`);

      return {
        query: cleanedQuery,
        dialect: schema.dialect,
        explanation: await this.explainQuery(cleanedQuery, question),
        metadata: {
          model: 'Qwen/Qwen2.5-Coder-32B-Instruct',
          tokensUsed: 0, // Will be tracked in usage module
          generatedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate SQL query:', error);
      throw new BadRequestException('Failed to generate SQL query. Please try rephrasing your question.');
    }
  }

  private cleanSqlQuery(query: string): string {
    // Remove markdown code blocks
    let cleaned = query.replace(/```sql\n?/gi, '').replace(/```\n?/g, '');
    
    // Remove extra whitespace
    cleaned = cleaned.trim();
    
    // Remove any explanatory text before the query
    const sqlKeywords = ['SELECT', 'WITH', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'];
    for (const keyword of sqlKeywords) {
      const index = cleaned.toUpperCase().indexOf(keyword);
      if (index > 0 && index < 100) {
        cleaned = cleaned.substring(index);
        break;
      }
    }
    
    return cleaned;
  }

  private validateSql(query: string): void {
    const upperQuery = query.toUpperCase().trim();
    
    // Check if it starts with a valid SQL keyword
    const validKeywords = ['SELECT', 'WITH', 'INSERT', 'UPDATE', 'DELETE'];
    const startsWithValid = validKeywords.some(keyword => upperQuery.startsWith(keyword));
    
    if (!startsWithValid) {
      throw new BadRequestException('Generated query does not appear to be valid SQL');
    }

    // Check for potentially dangerous operations (basic safety)
    const dangerousPatterns = ['DROP TABLE', 'DROP DATABASE', 'TRUNCATE', 'DELETE FROM.*WHERE.*1=1'];
    for (const pattern of dangerousPatterns) {
      if (new RegExp(pattern, 'i').test(query)) {
        this.logger.warn(`Potentially dangerous SQL pattern detected: ${pattern}`);
      }
    }
  }

  private async explainQuery(query: string, originalQuestion: string): Promise<string> {
    const explainPrompt = PromptTemplate.fromTemplate(`
Explain this SQL query in simple terms for someone who asked: "{question}"

SQL Query:
{query}

Provide a brief 2-3 sentence explanation of what this query does and what results it will return.

Explanation:
`);

    try {
      const chain = explainPrompt.pipe(this.llm).pipe(new StringOutputParser());
      const explanation = await chain.invoke({
        query,
        question: originalQuestion,
      });

      return explanation.trim();
    } catch (error) {
      this.logger.error('Failed to generate explanation:', error);
      return 'This query retrieves data from your database based on your question.';
    }
  }

  async optimizeQuery(query: string, dialect: string): Promise<string> {
    const optimizePrompt = PromptTemplate.fromTemplate(`
You are a database optimization expert. Optimize this {dialect} SQL query for better performance.

Original Query:
{query}

Provide an optimized version that:
1. Uses appropriate indexes
2. Minimizes subqueries
3. Uses efficient JOIN strategies
4. Reduces data scanning

Return ONLY the optimized SQL query:
`);

    try {
      const chain = optimizePrompt.pipe(this.llm).pipe(new StringOutputParser());
      const optimizedQuery = await chain.invoke({ query, dialect });

      return this.cleanSqlQuery(optimizedQuery);
    } catch (error) {
      this.logger.error('Failed to optimize query:', error);
      return query; // Return original if optimization fails
    }
  }
}

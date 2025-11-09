// Chatbot Service - AI Chat with Ollama streaming (using Node.js http for true streaming)
import { Injectable, NotFoundException, Logger, MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { WeaviateService } from '../../weaviate/weaviate.service';
import { RagService } from '../../weaviate/rag.service';
import { ProjectContextService } from '../../projects/services/project-context.service';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';
import { Observable } from 'rxjs';
import axios from 'axios';
import * as http from 'http';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly llm: ChatOpenAI;
  private readonly maxHistoryMessages = 10;
  private readonly ollamaUrl: string;
  private readonly modelName: string;
  private readonly useDirectOllama: boolean;
  private readonly enableRAG: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly weaviateService: WeaviateService,
    private readonly ragService: RagService,
    private readonly contextService: ProjectContextService,
  ) {
    // Initialize LLM for chat - Use Ollama or vLLM
    this.ollamaUrl = this.configService.get('OLLAMA_BASE_URL') || 'http://localhost:11434/v1';
    const vllmUrl = this.configService.get('VLLM_QWEN_7B_URL');
    const useOllama = this.configService.get('USE_OLLAMA') === 'true' || !vllmUrl;
    
    // Use direct Ollama API for better performance
    this.useDirectOllama = this.configService.get('USE_DIRECT_OLLAMA') !== 'false' && useOllama;
    
    // RAG can be disabled for faster responses (set ENABLE_RAG=false in .env)
    this.enableRAG = this.configService.get('ENABLE_RAG') !== 'false'; // Enabled by default
    
    const baseURL = useOllama ? this.ollamaUrl : vllmUrl;
    // Get model from env, default to 0.5b for ultra-fast CPU performance
    this.modelName = useOllama 
      ? (this.configService.get('OLLAMA_MODEL') || 'qwen2.5:0.5b')
      : 'Qwen/Qwen2.5-7B-Instruct';
    
    if (this.useDirectOllama) {
      this.logger.log(`Using DIRECT Ollama API at ${this.ollamaUrl} for maximum performance`);
      this.logger.log(`Model: ${this.modelName}`);
      this.logger.log(`RAG ${this.enableRAG ? 'ENABLED' : 'DISABLED'}`);
    } else {
      this.logger.log(`Initializing ChatOpenAI with ${useOllama ? 'Ollama' : 'vLLM'} at ${baseURL}`);
      this.logger.log(`Using model: ${this.modelName}`);
      
      this.llm = new ChatOpenAI({
        modelName: this.modelName,
        temperature: 0.7,
        maxTokens: 1500,
        configuration: {
          baseURL: baseURL,
          apiKey: 'EMPTY',
        },
      });
    }
  }

  async chat(projectId: string, message: string, conversationId?: string) {
    // Check if mock responses are enabled
    const useMockResponse = this.configService.get('USE_MOCK_CHAT') === 'true';
    
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        schema: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Generate or use existing conversation ID
    const convId = conversationId || uuidv4();

    // Get conversation history
    const history = await this.getConversationHistory(convId, projectId);

    // Build context from project schema
    const context = this.buildContext(project);

    // Create chat prompt
    const prompt = ChatPromptTemplate.fromMessages([
      new SystemMessage(`You are an AI assistant for the "${project.name}" project.

${context}

Your role:
- Help users understand their data
- Answer questions about the database schema
- Suggest SQL queries for data analysis
- Provide insights and recommendations
- Be conversational and helpful

Keep responses concise and relevant. If you need to show SQL, use markdown code blocks.`),
      new MessagesPlaceholder('history'),
      new HumanMessage('{input}'),
    ]);

    try {
      let response: string;
      
      // Use mock response if enabled (for testing)
      if (useMockResponse) {
        this.logger.warn('Mock chat enabled, using mock response');
        
        let schemaInfo = 'No schema uploaded yet.';
        if (project.schema) {
          try {
            const tables = typeof project.schema.tables === 'string' 
              ? JSON.parse(project.schema.tables) 
              : project.schema.tables;
            const tableCount = Array.isArray(tables) ? tables.length : 0;
            schemaInfo = `I can see you have a database schema with ${tableCount} tables.`;
          } catch (e) {
            schemaInfo = 'Schema found but could not parse table information.';
          }
        }
        
        response = `Hello! I'm a mock AI assistant for the "${project.name}" project. 

Your message: "${message}"

**Note**: This is a mock response. To get real AI responses, set USE_MOCK_CHAT=false.

${schemaInfo}`;
      } else if (this.useDirectOllama) {
        // FAST PATH: Direct Ollama API call (bypasses LangChain overhead)
        this.logger.debug('Using direct Ollama API for fast response');
        
        // Build comprehensive structured context with project context
        const structuredContext = await this.buildStructuredContext(project);
        
        const systemPrompt = `You are an expert AI assistant for the "${project.name}" project.

${structuredContext}

CRITICAL INSTRUCTIONS:
1. ONLY use information from the schema provided above
2. ALWAYS reference actual table and column names from this project
3. When suggesting SQL, use the EXACT table names and structure shown
4. If asked about data or charts, propose queries using REAL columns
5. Maintain conversation context - refer back to previous questions when relevant
6. Never use placeholder data like [Approval Percentage] - suggest actual SQL queries instead
7. If you don't have enough schema information, ask for clarification rather than guessing

Response Format:
- Be specific and actionable
- Provide SQL queries when relevant
- Reference actual table/column names
- Keep concise but comprehensive (3-5 sentences)
- For chart requests, suggest both the SQL query AND chart type`;

        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-8).map(msg => ({  // Last 8 messages for better conversation context
            role: msg.role === 'USER' ? 'user' : 'assistant',
            content: msg.content
          })),
          { role: 'user', content: message }
        ];

        const startTime = Date.now();
        this.logger.debug(`Calling Ollama with ${messages.length} messages`);
        
        const ollamaResponse = await axios.post(
          `${this.ollamaUrl.replace('/v1', '')}/api/chat`,
          {
            model: this.modelName,
            messages: messages,
            stream: false,
            options: {
              temperature: 0.3,  // Lower temperature for more accurate, factual responses
              num_predict: 800,  // Increased for detailed SQL queries and explanations
              top_p: 0.9,
              top_k: 40,
            }
          },
          {
            timeout: 60000, // 60 second timeout (first load can be slow)
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        response = ollamaResponse.data.message.content;
        const duration = Date.now() - startTime;
        this.logger.log(`Ollama response generated in ${duration}ms`);
        
      } else {
        // SLOW PATH: LangChain with OpenAI-compatible API
        const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

        response = await chain.invoke({
          input: message,
          history: history.map(msg => 
            msg.role === 'USER' 
              ? new HumanMessage(msg.content)
              : new AIMessage(msg.content)
          ),
        });
      }

      // Save messages to database
      await this.saveMessage(convId, projectId, message, 'USER');
      await this.saveMessage(convId, projectId, response, 'ASSISTANT');

      this.logger.log(`Chat response generated for conversation ${convId}`);

      return {
        conversationId: convId,
        response,
        timestamp: new Date(),
        metadata: {
          model: 'Qwen/Qwen2.5-7B-Instruct',
          tokensUsed: 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate chat response:', error.stack || error);
      
      // Check if it's a connection error to vLLM
      if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED') {
        throw new Error('AI model service is not available. Please ensure vLLM server is running on port 8003.');
      }
      
      // Check if it's a timeout
      if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
        throw new Error('AI model service timed out. The request took too long to process.');
      }
      
      // Include original error message for debugging
      const errorMessage = error.message || 'Unknown error';
      this.logger.error(`Original error message: ${errorMessage}`);
      
      throw new Error(`Failed to generate response: ${errorMessage}`);
    }
  }

  /**
   * Stream chat response using Server-Sent Events (SSE)
   * Provides progressive token-by-token response display
   */
  chatStream(projectId: string, message: string, conversationId?: string): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          // Verify project exists
          const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: {
              schema: true,
            },
          });

          if (!project) {
            subscriber.error(new NotFoundException('Project not found'));
            return;
          }

          // Generate or use existing conversation ID
          const convId = conversationId || uuidv4();

          // Get conversation history
          const history = await this.getConversationHistory(convId, projectId);

          // Send conversation ID immediately
          subscriber.next({
            data: JSON.stringify({
              type: 'conversationId',
              conversationId: convId,
            }),
          } as MessageEvent);

          let fullResponse = '';

          this.logger.debug(`=== CHATSTREAM DEBUG ===`);
          this.logger.debug(`useDirectOllama: ${this.useDirectOllama}`);
          this.logger.debug(`ollamaUrl: ${this.ollamaUrl}`);
          this.logger.debug(`modelName: ${this.modelName}`);

          if (this.useDirectOllama) {
            // FAST STREAMING: Direct Ollama API with streaming
            this.logger.debug('Using direct Ollama streaming API');
            
            // Build comprehensive structured context with project context
            const structuredContext = await this.buildStructuredContext(project);
            
            // Build enhanced system prompt with domain-specific guidance
            const basePrompt = `You are an AI assistant for "${project.name}".

${structuredContext}

CRITICAL RULES:
1. Use ONLY tables/columns from the schema above
2. Focus on domain-specific tables (e.g., for surveys: use survey_responses, surveys, questions NOT generic user tables)
3. Provide executable SQL with proper JOINs
4. For charts: SQL query + Chart.js config with REAL data mapping
5. Never use mock/placeholder data in examples

QUERY PATTERN EXAMPLES:
For survey analytics, prioritize:
- survey_responses (response data)
- surveys (survey metadata)
- questions (question definitions)
- respondents (who answered)

Example Query Pattern:
\`\`\`sql
SELECT q.question_text, COUNT(*) as response_count
FROM survey_responses sr
JOIN questions q ON sr.question_id = q.id
GROUP BY q.id, q.question_text;
\`\`\`

Chart.js Config Pattern (use SQL results):
\`\`\`chartjs
{
  "type": "bar",
  "data": {
    "labels": ["Extract from SQL: q.question_text"],
    "datasets": [{
      "label": "Responses",
      "data": ["Extract from SQL: response_count"]
    }]
  }
}
\`\`\`

Response Format:
- SQL in \`\`\`sql blocks
- Charts in \`\`\`chartjs blocks (explain data mapping)
- Be specific to project domain`;

            // Get RAG-enhanced prompt with past successful examples
            const systemPrompt = this.enableRAG
              ? await this.ragService.buildEnhancedPrompt(
                  message,
                  projectId,
                  project.schema,
                  basePrompt,
                )
              : basePrompt;

            const messages = [
              { role: 'system', content: systemPrompt },
              ...history.slice(-8).map(msg => ({  // Last 8 messages for conversation continuity
                role: msg.role === 'USER' ? 'user' : 'assistant',
                content: msg.content
              })),
              { role: 'user', content: message }
            ];

            const startTime = Date.now();
            
            // Make streaming request to Ollama using Node.js http
            const ollamaApiUrl = `${this.ollamaUrl.replace('/v1', '')}/api/chat`;
            this.logger.debug(`Connecting to Ollama at: ${ollamaApiUrl}`);
            
            const requestBody = JSON.stringify({
              model: this.modelName,
              messages: messages,
              stream: true,
              options: {
                temperature: 0.3,
                num_predict: 800,
                top_p: 0.9,
                top_k: 40,
              }
            });

            const options = {
              hostname: 'localhost',
              port: 11434,
              path: '/api/chat',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody),
              },
            };

            this.logger.debug('Making http request to Ollama...');
            this.logger.debug(`Request options: ${JSON.stringify(options)}`);
            this.logger.debug(`Request body length: ${Buffer.byteLength(requestBody)} bytes`);

            const req = http.request(options, (res) => {
              this.logger.debug(`Ollama response status: ${res.statusCode}`);
              
              let buffer = '';
              let tokenCount = 0;

              res.on('data', (chunk: Buffer) => {
                const chunkStr = chunk.toString();
                buffer += chunkStr;
                
                // Split by newlines (Ollama sends one JSON per line)
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                  if (line.trim()) {
                    try {
                      const data = JSON.parse(line);
                      if (data.message?.content) {
                        const token = data.message.content;
                        fullResponse += token;
                        tokenCount++;
                        
                        // Send token to client
                        subscriber.next({
                          data: JSON.stringify({
                            type: 'token',
                            content: token,
                          }),
                        } as MessageEvent);
                      }
                      
                      if (data.done) {
                        const duration = Date.now() - startTime;
                        this.logger.log(`Streamed Ollama response in ${duration}ms (${tokenCount} tokens)`);
                      }
                    } catch (parseError) {
                      this.logger.error(`Failed to parse streaming chunk: ${line}`, parseError);
                    }
                  }
                }
              });

              res.on('error', (error: Error) => {
                this.logger.error('Stream error from Ollama:', error);
                subscriber.error(error);
              });

              res.on('end', async () => {
                this.logger.debug('Ollama stream completed');
                
                try {
                  // Save messages to database
                  await this.saveMessage(convId, projectId, message, 'USER');
                  await this.saveMessage(convId, projectId, fullResponse, 'ASSISTANT');

                  // Store successful interaction in Weaviate for RAG learning
                  await this.storeSuccessfulInteraction(
                    projectId,
                    message,
                    fullResponse,
                    project.schema,
                  );

                  // Send completion event
                  subscriber.next({
                    data: JSON.stringify({
                      type: 'complete',
                      timestamp: new Date().toISOString(),
                      metadata: {
                        model: this.modelName,
                        conversationId: convId,
                      },
                    }),
                  } as MessageEvent);

                  this.logger.log(`Completed chat for conversation ${convId}`);
                  subscriber.complete();
                } catch (saveError) {
                  this.logger.error('Error saving messages:', saveError);
                  subscriber.error(saveError);
                }
              });
            });

            req.on('error', (error: any) => {
              this.logger.error('Error making Ollama request:', error);
              this.logger.error(`Error details - Code: ${error.code || 'UNKNOWN'}, Message: ${error.message}`);
              this.logger.error(`Full error stack:`, error.stack);
              subscriber.error(error);
            });

            req.on('timeout', () => {
              this.logger.error('Ollama request timed out after 5 minutes');
              req.destroy();
              subscriber.error(new Error('Request timeout - Ollama took too long to respond'));
            });

            // Increase timeout to 5 minutes for first-time model loading
            req.setTimeout(300000); // 5 minutes
            req.write(requestBody);
            req.end();
            
          } else {
            // SLOW STREAMING: LangChain with OpenAI-compatible API
            const context = this.buildContext(project);
            
            const prompt = ChatPromptTemplate.fromMessages([
              new SystemMessage(`You are an AI assistant for the "${project.name}" project.

${context}

Your role:
- Help users understand their data
- Answer questions about the database schema
- Suggest SQL queries for data analysis
- Provide insights and recommendations
- Be conversational and helpful

Keep responses concise and relevant. If you need to show SQL, use markdown code blocks.`),
              new MessagesPlaceholder('history'),
              new HumanMessage('{input}'),
            ]);

            const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

            // Stream the response
            const stream = await chain.stream({
              input: message,
              history: history.map(msg => 
                msg.role === 'USER' 
                  ? new HumanMessage(msg.content)
                  : new AIMessage(msg.content)
              ),
            });

            // Process each token from the stream
            for await (const chunk of stream) {
              fullResponse += chunk;
              
              // Send token to client
              subscriber.next({
                data: JSON.stringify({
                  type: 'token',
                  content: chunk,
                }),
              } as MessageEvent);
            }
            
            // Save messages to database (for LangChain path)
            await this.saveMessage(convId, projectId, message, 'USER');
            await this.saveMessage(convId, projectId, fullResponse, 'ASSISTANT');

            // Send completion event
            subscriber.next({
              data: JSON.stringify({
                type: 'complete',
                timestamp: new Date().toISOString(),
                metadata: {
                  model: this.modelName,
                  conversationId: convId,
                },
              }),
            } as MessageEvent);

            this.logger.log(`Streamed chat response for conversation ${convId}`);
            subscriber.complete();
          }
        } catch (error) {
          this.logger.error('Failed to stream chat response:', error);
          
          // Send error event to client before closing stream
          try {
            subscriber.next({
              data: JSON.stringify({
                type: 'error',
                message: error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')
                  ? 'AI model service is not available. Please ensure vLLM server is running.'
                  : error.message || 'Failed to stream response',
              }),
            } as MessageEvent);
          } catch (sendError) {
            this.logger.error('Failed to send error event:', sendError);
          }
          
          subscriber.error(error);
        }
      })();
    });
  }

  async getConversationHistory(conversationId: string, projectId: string, limit = this.maxHistoryMessages) {
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return messages.reverse(); // Return in chronological order
  }

  async deleteConversation(conversationId: string, projectId: string) {
    await this.prisma.chatMessage.deleteMany({
      where: {
        conversationId,
        projectId,
      },
    });

    this.logger.log(`Deleted conversation ${conversationId}`);
  }

  async listConversations(projectId: string) {
    // Get unique conversation IDs with latest message
    const conversations = await this.prisma.chatMessage.groupBy({
      by: ['conversationId'],
      where: {
        projectId,
      },
      _max: {
        createdAt: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _max: {
          createdAt: 'desc',
        },
      },
    });

    // Get first message of each conversation for preview
    const conversationsWithPreview = await Promise.all(
      conversations.map(async (conv) => {
        const firstMessage = await this.prisma.chatMessage.findFirst({
          where: {
            conversationId: conv.conversationId,
            projectId,
            role: 'USER',
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        return {
          conversationId: conv.conversationId,
          messageCount: conv._count.id,
          lastMessageAt: conv._max.createdAt,
          preview: firstMessage?.content.substring(0, 100) || 'No preview available',
        };
      })
    );

    return conversationsWithPreview;
  }

  private async saveMessage(conversationId: string, projectId: string, content: string, role: 'USER' | 'ASSISTANT') {
    await this.prisma.chatMessage.create({
      data: {
        conversationId,
        projectId,
        content,
        role,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  private buildContext(project: any): string {
    const context: string[] = [];

    context.push(`Project: ${project.name}`);
    if (project.description) {
      context.push(`Description: ${project.description}`);
    }

    if (project.schema) {
      context.push('\nDatabase Schema Summary:');
      context.push(project.schema.schemaSummary.substring(0, 1000)); // Limit context size
      context.push(`\nDialect: ${project.schema.dialect}`);
    } else {
      context.push('\nNo database schema available yet.');
    }

    return context.join('\n');
  }

  /**
   * Build structured context with full schema details for accurate responses
   * Uses hierarchical structure for better AI comprehension
   */
  private async buildStructuredContext(project: any): Promise<string> {
    const sections: string[] = [];

    // 1. Project Overview
    sections.push('=== PROJECT INFORMATION ===');
    sections.push(`Name: ${project.name}`);
    if (project.description) {
      sections.push(`Description: ${project.description}`);
    }
    sections.push(`Environment: ${project.environment || 'Not specified'}`);
    sections.push('');

    // 2. Project Context (AI + Manual)
    try {
      const context = await this.contextService.getContext(project.id);
      if (context && context.fullContext) {
        sections.push('=== PROJECT CONTEXT ===');
        sections.push(context.fullContext.substring(0, 600)); // Limit context size
        sections.push('');
      }
    } catch (error) {
      this.logger.debug('No project context available:', error.message);
    }

    // 3. Database Schema (Prioritize domain-specific tables)
    if (project.schema) {
      sections.push('=== DATABASE SCHEMA ===');
      sections.push(`DB: ${project.schema.dialect}`);
      
      try {
        const tables = typeof project.schema.tables === 'string' 
          ? JSON.parse(project.schema.tables) 
          : project.schema.tables;
        
        if (Array.isArray(tables) && tables.length > 0) {
          sections.push(`Tables: ${tables.length}`);
          sections.push('');
          
          // Separate domain-specific tables from generic tables
          const domainTables = tables.filter((t: any) => {
            const name = (t.name || '').toLowerCase();
            return !['users', 'roles', 'permissions', 'user_roles', 'settings', 'logs', 'audit'].some(
              generic => name.includes(generic)
            );
          });
          
          const genericTables = tables.filter((t: any) => {
            const name = (t.name || '').toLowerCase();
            return ['users', 'roles', 'permissions', 'user_roles', 'settings', 'logs', 'audit'].some(
              generic => name.includes(generic)
            );
          });
          
          // Show domain-specific tables FIRST (most important)
          sections.push('CORE TABLES (Use these for analytics):');
          const coreTablesToShow = domainTables.slice(0, 8);
          coreTablesToShow.forEach((table: any, index: number) => {
            const tableName = table.name || table.table_name || `Table_${index + 1}`;
            sections.push(`★ ${tableName}:`);
            
            // Show key columns (PK, FK, and first few regular columns)
            if (table.columns && Array.isArray(table.columns)) {
              const pkCols = table.columns.filter((c: any) => c.isPrimaryKey).map((c: any) => `${c.name}(PK)`);
              const fkCols = table.columns.filter((c: any) => c.isForeignKey).slice(0, 2).map((c: any) => `${c.name}(FK)`);
              const regularCols = table.columns
                .filter((c: any) => !c.isPrimaryKey && !c.isForeignKey)
                .slice(0, 3)
                .map((c: any) => `${c.name}(${(c.type || '').substring(0, 15)})`);
              
              const colList = [...pkCols, ...fkCols, ...regularCols].join(', ');
              sections.push(`   ${colList}${table.columns.length > 6 ? '...' : ''}`);
            }
          });
          
          if (domainTables.length > 8) {
            sections.push(`... +${domainTables.length - 8} more core tables`);
          }
          
          // Show generic tables (lower priority)
          if (genericTables.length > 0) {
            sections.push('');
            sections.push(`SYSTEM TABLES (${genericTables.length}): ${genericTables.map((t: any) => t.name).slice(0, 5).join(', ')}${genericTables.length > 5 ? '...' : ''}`);
          }
        }
      } catch (e) {
        sections.push('Schema parsing error');
      }
    } else {
      sections.push('No schema uploaded');
    }

    return sections.join('\n');
  }

  /**
   * Store successful interaction in Weaviate for RAG learning
   */
  private async storeSuccessfulInteraction(
    projectId: string,
    question: string,
    answer: string,
    schema: any,
  ): Promise<void> {
    try {
      // Extract SQL query if present
      const sqlMatch = answer.match(/```sql\n([\s\S]*?)\n```/);
      const sqlQuery = sqlMatch ? sqlMatch[1].trim() : undefined;

      // Extract chart config if present
      const chartMatch = answer.match(/```(?:chartjs|chart|json)\n([\s\S]*?)\n```/);
      let chartConfig = undefined;
      if (chartMatch) {
        try {
          chartConfig = JSON.parse(chartMatch[1]);
        } catch (e) {
          this.logger.debug('Failed to parse chart config for RAG storage');
        }
      }

      // Store in Weaviate for RAG
      await this.ragService.storeExample({
        projectId,
        question,
        answer,
        sqlQuery,
        chartConfig,
        successful: true, // Assume successful if it completed
        timestamp: new Date(),
        schemaSnapshot: schema?.tables ? {
          dialect: schema.dialect,
          tableCount: Array.isArray(schema.tables) ? schema.tables.length : 0,
          tables: schema.tables,
        } : undefined,
      });

      this.logger.debug(`✅ Stored conversation in RAG for project ${projectId}`);
    } catch (error) {
      // Don't fail the request if RAG storage fails
      this.logger.warn('Failed to store conversation for RAG:', error.message);
    }
  }

  /**
   * Submit user feedback for a chat message
   */
  async submitFeedback(dto: {
    messageId: string;
    projectId: string;
    rating: number;
    stars?: number;
    helpful: boolean;
    comment?: string;
  }) {
    try {
      // Verify the message exists
      const message = await this.prisma.chatMessage.findFirst({
        where: {
          id: dto.messageId,
          projectId: dto.projectId,
        },
      });

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      // Create feedback record
      const feedback = await this.prisma.userFeedback.create({
        data: {
          messageId: dto.messageId,
          projectId: dto.projectId,
          rating: dto.rating,
          stars: dto.stars,
          helpful: dto.helpful,
          comment: dto.comment,
        },
      });

      this.logger.log(`Feedback submitted for message ${dto.messageId}: rating=${dto.rating}, stars=${dto.stars || 'none'}`);

      // Update the corresponding TrainingExample in Weaviate with the rating
      // Get the original question from the message
      if (message.role === 'USER') {
        // If this is a user message, find the assistant response
        const assistantMessage = await this.prisma.chatMessage.findFirst({
          where: {
            conversationId: message.conversationId,
            createdAt: { gt: message.createdAt },
            role: 'ASSISTANT',
          },
          orderBy: { createdAt: 'asc' },
        });
        
        if (assistantMessage) {
          await this.ragService.updateUserRating(
            dto.projectId,
            message.content, // The question
            dto.rating,
          );
        }
      } else if (message.role === 'ASSISTANT') {
        // Find the previous user message (question)
        const userMessage = await this.prisma.chatMessage.findFirst({
          where: {
            conversationId: message.conversationId,
            createdAt: { lt: message.createdAt },
            role: 'USER',
          },
          orderBy: { createdAt: 'desc' },
        });
        
        if (userMessage) {
          await this.ragService.updateUserRating(
            dto.projectId,
            userMessage.content, // The question
            dto.rating,
          );
        }
      }

      return {
        success: true,
        feedbackId: feedback.id,
        message: 'Feedback submitted successfully',
      };
    } catch (error) {
      this.logger.error('Failed to submit feedback:', error.message);
      throw error;
    }
  }
}

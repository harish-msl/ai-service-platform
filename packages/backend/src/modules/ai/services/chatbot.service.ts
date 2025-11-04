import { Injectable, NotFoundException, Logger, MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { WeaviateService } from '../../weaviate/weaviate.service';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';
import { Observable } from 'rxjs';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly llm: ChatOpenAI;
  private readonly maxHistoryMessages = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly weaviateService: WeaviateService,
  ) {
    // Initialize LLM for chat
    const vllmUrl = this.configService.get('VLLM_QWEN_7B_URL') || 'http://localhost:8003/v1';
    this.logger.log(`Initializing ChatOpenAI with vLLM URL: ${vllmUrl}`);
    
    this.llm = new ChatOpenAI({
      modelName: 'Qwen/Qwen2.5-7B-Instruct',
      temperature: 0.7,
      maxTokens: 1500,
      configuration: {
        baseURL: vllmUrl,
        apiKey: 'EMPTY',
      },
    });
  }

  async chat(projectId: string, message: string, conversationId?: string) {
    // TEMPORARY: Check if vLLM is available, use mock response if not
    const useMockResponse = !this.configService.get('VLLM_QWEN_7B_URL') || 
                           this.configService.get('USE_MOCK_CHAT') === 'true';
    
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
      
      // Use mock response if vLLM not available (for testing)
      if (useMockResponse) {
        this.logger.warn('vLLM not available, using mock response');
        
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

**Note**: This is a mock response because the vLLM server is not running. To get real AI responses:
1. Start vLLM server: \`vllm serve Qwen/Qwen2.5-7B-Instruct --port 8003\`
2. Or set USE_MOCK_CHAT=false in environment variables

${schemaInfo}`;
      } else {
        // Real AI response from vLLM
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

          // Send conversation ID immediately
          subscriber.next({
            data: JSON.stringify({
              type: 'conversationId',
              conversationId: convId,
            }),
          } as MessageEvent);

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

          let fullResponse = '';

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

          // Save messages to database
          await this.saveMessage(convId, projectId, message, 'USER');
          await this.saveMessage(convId, projectId, fullResponse, 'ASSISTANT');

          // Send completion event
          subscriber.next({
            data: JSON.stringify({
              type: 'complete',
              timestamp: new Date().toISOString(),
              metadata: {
                model: 'Qwen/Qwen2.5-7B-Instruct',
                conversationId: convId,
              },
            }),
          } as MessageEvent);

          this.logger.log(`Streamed chat response for conversation ${convId}`);
          subscriber.complete();

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
}

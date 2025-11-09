import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Sse, MessageEvent } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentProject } from '../api-keys/decorators/current-project.decorator';
import { QueryGenerationService } from './services/query-generation.service';
import { ChatbotService } from './services/chatbot.service';
import { AnalyticsService } from './services/analytics.service';
import { GenerateQueryDto } from './dto/generate-query.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
import { AnalyticsRequestDto } from './dto/analytics-request.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@ApiTags('AI Services')
@Controller('ai')
export class AiController {
  constructor(
    private readonly queryGenerationService: QueryGenerationService,
    private readonly chatbotService: ChatbotService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // Query Generation Endpoints (API Key Auth)
  @Post('query/generate')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Generate SQL query from natural language' })
  @ApiResponse({ status: 200, description: 'SQL query generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or schema not found' })
  async generateQuery(@Body() dto: GenerateQueryDto) {
    return this.queryGenerationService.generateQuery(dto.projectId, dto.question, dto.context);
  }

  @Post('query/optimize')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Optimize an existing SQL query' })
  @ApiResponse({ status: 200, description: 'Query optimized successfully' })
  async optimizeQuery(
    @Body() body: { query: string; dialect: string },
    @CurrentProject('id') projectId: string,
  ) {
    return this.queryGenerationService.optimizeQuery(body.query, body.dialect);
  }

  // Chatbot Endpoints (JWT Auth for admin panel)
  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a message to the AI chatbot' })
  @ApiResponse({ status: 200, description: 'Chat response generated successfully' })
  async chat(@Body() dto: ChatMessageDto, @CurrentUser('id') userId: string) {
    try {
      return await this.chatbotService.chat(dto.projectId, dto.message, dto.conversationId);
    } catch (error) {
      throw error; // Will be caught by global exception filter
    }
  }

  @Sse('chat/stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stream chat response with Server-Sent Events (SSE)' })
  @ApiResponse({ status: 200, description: 'Chat response streamed successfully' })
  chatStream(
    @Query('projectId') projectId: string,
    @Query('message') message: string,
    @Query('conversationId') conversationId: string | undefined,
    @CurrentUser('id') userId: string,
  ): Observable<MessageEvent> {
    return this.chatbotService.chatStream(projectId, message, conversationId);
  }

  @Get('chat/conversations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all conversations for a project' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async listConversations(@Query('projectId') projectId: string, @CurrentUser('id') userId: string) {
    return this.chatbotService.listConversations(projectId);
  }

  @Get('chat/history/:conversationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get conversation history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  async getConversationHistory(
    @Param('conversationId') conversationId: string,
    @Query('projectId') projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatbotService.getConversationHistory(conversationId, projectId);
  }

  @Delete('chat/conversation/:conversationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiResponse({ status: 204, description: 'Conversation deleted successfully' })
  async deleteConversation(
    @Param('conversationId') conversationId: string,
    @Query('projectId') projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.chatbotService.deleteConversation(conversationId, projectId);
  }

  // Analytics Endpoints (API Key Auth)
  @Post('analytics')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Perform AI-powered data analytics' })
  @ApiResponse({ status: 200, description: 'Analytics generated successfully' })
  async analyzeData(@Body() dto: AnalyticsRequestDto) {
    return this.analyticsService.analyzeData(dto.projectId, dto.type, dto.query, dto.parameters);
  }

  // Chat endpoint with API Key (for external integrations)
  @Post('chat/external')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'External chat endpoint (API key auth)' })
  @ApiResponse({ status: 200, description: 'Chat response generated successfully' })
  async chatExternal(@Body() dto: ChatMessageDto, @CurrentProject('id') projectId: string) {
    return this.chatbotService.chat(projectId, dto.message, dto.conversationId);
  }

  // Feedback Endpoints
  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit feedback for a chat message' })
  @ApiResponse({ status: 201, description: 'Feedback submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async submitFeedback(@Body() dto: SubmitFeedbackDto, @CurrentUser('id') userId: string) {
    return this.chatbotService.submitFeedback(dto);
  }
}

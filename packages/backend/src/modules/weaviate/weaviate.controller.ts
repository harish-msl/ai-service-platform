import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WeaviateService } from './weaviate.service';

@ApiTags('Weaviate / Vector Storage')
@Controller('weaviate')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WeaviateController {
  constructor(private readonly weaviateService: WeaviateService) {}

  @Post('index')
  @ApiOperation({ summary: 'Index a document manually' })
  @ApiResponse({ status: 201, description: 'Document indexed successfully' })
  async indexDocument(
    @Body()
    body: {
      projectId: string;
      content: string;
      metadata: any;
    },
  ) {
    const id = await this.weaviateService.indexDocument({
      projectId: body.projectId,
      content: body.content,
      metadata: body.metadata,
    });

    return { success: true, documentId: id };
  }

  @Get('search')
  @ApiOperation({ summary: 'Semantic search across documents' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async search(
    @Query('query') query: string,
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
  ) {
    const results = await this.weaviateService.semanticSearch(
      query,
      projectId,
      limit ? parseInt(limit.toString()) : 5,
      type,
    );

    return {
      query,
      results,
      count: results.length,
    };
  }

  @Get('context')
  @ApiOperation({ summary: 'Get relevant context for a query' })
  @ApiResponse({ status: 200, description: 'Context retrieved successfully' })
  async getContext(
    @Query('query') query: string,
    @Query('projectId') projectId: string,
    @Query('maxTokens') maxTokens?: number,
  ) {
    const context = await this.weaviateService.getRelevantContext(
      query,
      projectId,
      maxTokens ? parseInt(maxTokens.toString()) : 2000,
    );

    return {
      query,
      projectId,
      context,
      characterCount: context.length,
      estimatedTokens: Math.ceil(context.length / 4),
    };
  }

  @Get('document/:id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocument(@Param('id') id: string) {
    const document = await this.weaviateService.getDocumentById(id);

    if (!document) {
      return { success: false, message: 'Document not found' };
    }

    return { success: true, document };
  }

  @Delete('document/:id')
  @ApiOperation({ summary: 'Delete document by ID' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  async deleteDocument(@Param('id') id: string) {
    const success = await this.weaviateService.deleteDocument(id);

    return { success, message: success ? 'Document deleted' : 'Failed to delete document' };
  }

  @Delete('project/:projectId')
  @ApiOperation({ summary: 'Delete all documents for a project' })
  @ApiResponse({ status: 200, description: 'Project documents deleted successfully' })
  async deleteProjectDocuments(@Param('projectId') projectId: string) {
    const count = await this.weaviateService.deleteProjectDocuments(projectId);

    return { success: true, deletedCount: count };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get Weaviate statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats() {
    return this.weaviateService.getStats();
  }
}

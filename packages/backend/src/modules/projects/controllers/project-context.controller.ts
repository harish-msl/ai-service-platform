// Project Context Controller - API endpoints for context management
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectContextService } from '../services/project-context.service';
import { Observable, from, map } from 'rxjs';

@ApiTags('Project Context')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/context')
export class ProjectContextController {
  constructor(private readonly contextService: ProjectContextService) {}

  @Sse('generate/stream')
  @ApiOperation({ summary: 'Generate AI context with real-time progress updates (SSE)' })
  generateContextStream(
    @Param('projectId') projectId: string,
    @Query('force') force?: string,
  ): Observable<MessageEvent> {
    const generator = this.contextService.generateContextWithProgress({
      projectId,
      forceRegenerate: force === 'true',
    });

    return from(
      (async function* () {
        for await (const progress of generator) {
          yield progress;
        }
      })()
    ).pipe(
      map((data) => ({
        data,
      })),
    );
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate AI context preview (not saved until confirmed)' })
  @ApiResponse({ status: 200, description: 'Context preview generated successfully' })
  async generateContext(
    @Param('projectId') projectId: string,
    @Query('force') force?: string,
  ) {
    return this.contextService.generateContextPreview({
      projectId,
      forceRegenerate: force === 'true',
    });
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm and save AI-generated context (with optional edits)' })
  @ApiResponse({ status: 200, description: 'Context saved successfully' })
  async confirmContext(
    @Param('projectId') projectId: string,
    @Body() contextData: {
      aiGeneratedContext: string;
      contextSummary: string;
      initialPrompts: string[];
      userEdits?: {
        contextSummary?: string;
        initialPrompts?: string[];
        aiGeneratedContext?: string;
      };
    },
  ) {
    return this.contextService.confirmContext(projectId, contextData);
  }

  @Get()
  @ApiOperation({ summary: 'Get project context (AI + manual merged)' })
  @ApiResponse({ status: 200, description: 'Context retrieved' })
  async getContext(@Param('projectId') projectId: string) {
    return this.contextService.getContext(projectId);
  }

  @Put('manual')
  @ApiOperation({ summary: 'Update manual context JSON' })
  @ApiResponse({ status: 200, description: 'Manual context updated' })
  async updateManualContext(
    @Param('projectId') projectId: string,
    @Body() contextJson: any,
  ) {
    return this.contextService.updateManualContext({
      projectId,
      contextJson,
    });
  }

  @Get('template')
  @ApiOperation({ summary: 'Get default context template (downloadable)' })
  @ApiResponse({ status: 200, description: 'Template retrieved' })
  getDefaultTemplate() {
    return this.contextService.getDefaultTemplate();
  }

  @Get('suggestions/initial')
  @ApiOperation({ summary: 'Get initial suggestion prompts' })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved' })
  async getInitialSuggestions(@Param('projectId') projectId: string) {
    const context = await this.contextService.getContext(projectId);
    return {
      suggestions: context?.initialPrompts || [],
    };
  }

  @Post('suggestions/followup')
  @ApiOperation({ summary: 'Get follow-up suggestion prompts' })
  @ApiResponse({ status: 200, description: 'Follow-up suggestions generated' })
  async getFollowUpSuggestions(
    @Param('projectId') projectId: string,
    @Body() body: { conversationHistory: string[] },
  ) {
    const suggestions = await this.contextService.generateFollowUpPrompts(
      projectId,
      body.conversationHistory,
    );
    return { suggestions };
  }
}

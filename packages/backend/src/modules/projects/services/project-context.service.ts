// Project Context Service - Generate and manage AI context for projects
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface GenerateContextDto {
  projectId: string;
  forceRegenerate?: boolean;
}

interface UpdateManualContextDto {
  projectId: string;
  contextJson: any;
}

@Injectable()
export class ProjectContextService {
  private readonly logger = new Logger(ProjectContextService.name);
  private readonly ollamaUrl: string;
  private readonly modelName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.ollamaUrl = this.configService.get('OLLAMA_BASE_URL') || 'http://localhost:11434';
    this.modelName = this.configService.get('OLLAMA_MODEL') || 'qwen2.5:0.5b';
  }

  /**
   * Generate AI context preview (not saved until user confirms)
   * Emits real-time progress updates
   */
  async generateContextPreview(dto: GenerateContextDto): Promise<any> {
    const { projectId, forceRegenerate = false } = dto;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { schema: true, context: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.schema) {
      throw new NotFoundException('Project schema not found. Please upload schema first.');
    }

    this.logger.log(`Generating AI context preview for project ${project.name}`);

    // Step 1: Scanning Database Schema
    this.logger.log('Step 1/5: Scanning database schema...');
    const tables = Array.isArray(project.schema.tables) ? project.schema.tables : [];
    const schemaStats = {
      tables: tables.length || 0,
      totalColumns: tables.reduce((acc: number, t: any) => acc + (t.columns?.length || 0), 0) || 0,
    };

    // Step 2: Building prompt
    this.logger.log('Step 2/5: Building AI prompt from schema...');
    const prompt = this.buildContextGenerationPrompt(project);

    // Step 3: AI Analysis
    this.logger.log('Step 3/5: Calling AI for context generation...');
    const aiContext = await this.callOllama(prompt);

    // Step 4: Parse AI response
    this.logger.log('Step 4/5: Parsing AI response...');
    const parsedContext = this.parseAIContext(aiContext);

    // Step 5: Generate suggestions
    this.logger.log('Step 5/5: Generating suggestion prompts...');
    const initialPrompts = this.generateInitialPrompts(project.schema);

    this.logger.log(`Context preview generated successfully for project ${project.name}`);

    // Return preview data (not saved yet)
    return {
      preview: true,
      aiGeneratedContext: aiContext,
      contextSummary: parsedContext.summary,
      initialPrompts,
      projectName: project.name,
      projectDescription: project.description,
      stats: schemaStats,
    };
  }

  /**
   * Generate context with SSE progress updates
   */
  async *generateContextWithProgress(dto: GenerateContextDto): AsyncGenerator<any> {
    const { projectId, forceRegenerate = false } = dto;

    try {
      // Step 1: Fetch project and schema
      yield { step: 'scanning', progress: 0, message: 'Fetching project and schema...' };
      
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: { schema: true, context: true },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      if (!project.schema) {
        throw new NotFoundException('Project schema not found. Please upload schema first.');
      }

      const tables = Array.isArray(project.schema.tables) ? project.schema.tables : [];
      const schemaStats = {
        tables: tables.length || 0,
        totalColumns: tables.reduce((acc: number, t: any) => acc + (t.columns?.length || 0), 0) || 0,
      };

      yield { 
        step: 'scanning', 
        progress: 20, 
        message: `Analyzing ${schemaStats.tables} tables and ${schemaStats.totalColumns} columns...`,
        stats: schemaStats,
      };

      // Step 2: Build prompt
      yield { step: 'indexing', progress: 40, message: 'Creating semantic embeddings...' };
      const prompt = this.buildContextGenerationPrompt(project);

      // Step 3: Call AI
      yield { step: 'analyzing', progress: 50, message: 'AI is analyzing your database structure...' };
      const aiContext = await this.callOllama(prompt);
      
      yield { step: 'analyzing', progress: 70, message: 'Understanding business logic and patterns...' };

      // Step 4: Parse response
      yield { step: 'generating', progress: 80, message: 'Extracting context and insights...' };
      const parsedContext = this.parseAIContext(aiContext);

      // Step 5: Generate prompts
      yield { step: 'optimizing', progress: 90, message: 'Creating intelligent suggestion prompts...' };
      const initialPrompts = this.generateInitialPrompts(project.schema);

      // Complete
      yield { 
        step: 'complete', 
        progress: 100, 
        message: 'Context generated successfully!',
        data: {
          preview: true,
          aiGeneratedContext: aiContext,
          contextSummary: parsedContext.summary,
          initialPrompts,
          projectName: project.name,
          projectDescription: project.description,
          stats: schemaStats,
        },
      };
    } catch (error) {
      yield { 
        step: 'error', 
        progress: 0, 
        message: error.message || 'Failed to generate context',
        error: true,
      };
      throw error;
    }
  }

  /**
   * Confirm and save AI-generated context (with optional user edits)
   */
  async confirmContext(
    projectId: string,
    contextData: {
      aiGeneratedContext: string;
      contextSummary: string;
      initialPrompts: string[];
      userEdits?: {
        contextSummary?: string;
        initialPrompts?: string[];
        aiGeneratedContext?: string;
      };
    },
  ): Promise<any> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Apply user edits if provided
    const finalSummary = contextData.userEdits?.contextSummary || contextData.contextSummary;
    const finalPrompts = contextData.userEdits?.initialPrompts || contextData.initialPrompts;
    const finalContext = contextData.userEdits?.aiGeneratedContext || contextData.aiGeneratedContext;

    // Save to database
    const context = await this.prisma.projectContext.upsert({
      where: { projectId },
      create: {
        projectId,
        aiGeneratedContext: finalContext,
        contextSummary: finalSummary,
        initialPrompts: finalPrompts,
        lastAiGeneratedAt: new Date(),
      },
      update: {
        aiGeneratedContext: finalContext,
        contextSummary: finalSummary,
        initialPrompts: finalPrompts,
        lastAiGeneratedAt: new Date(),
      },
    });

    this.logger.log(`Context confirmed and saved for project ${project.name}`);

    return {
      success: true,
      message: 'Context saved successfully',
      context,
    };
  }

  /**
   * Generate AI context from project schema (backward compatibility - auto-saves)
   */
  async generateContext(dto: GenerateContextDto): Promise<any> {
    const { projectId, forceRegenerate = false } = dto;

    // Get project with schema
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { schema: true, context: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.schema) {
      throw new NotFoundException('Project schema not found. Please upload schema first.');
    }

    // Check if context exists and is recent (within 7 days)
    if (!forceRegenerate && project.context?.lastAiGeneratedAt) {
      const daysSinceGeneration = 
        (Date.now() - new Date(project.context.lastAiGeneratedAt).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceGeneration < 7) {
        this.logger.debug(`Using existing context (${daysSinceGeneration.toFixed(1)} days old)`);
        return project.context;
      }
    }

    this.logger.log(`Generating AI context for project ${project.name}`);

    // Build context generation prompt
    const prompt = this.buildContextGenerationPrompt(project);

    // Call Ollama to generate context
    const aiContext = await this.callOllama(prompt);

    // Parse AI response to extract structured context
    const parsedContext = this.parseAIContext(aiContext);

    // Generate initial suggestion prompts
    const initialPrompts = this.generateInitialPrompts(project.schema);

    // Upsert context
    const context = await this.prisma.projectContext.upsert({
      where: { projectId },
      create: {
        projectId,
        aiGeneratedContext: aiContext,
        contextSummary: parsedContext.summary,
        initialPrompts,
        lastAiGeneratedAt: new Date(),
      },
      update: {
        aiGeneratedContext: aiContext,
        contextSummary: parsedContext.summary,
        initialPrompts,
        lastAiGeneratedAt: new Date(),
      },
    });

    this.logger.log(`Context generated successfully for project ${project.name}`);

    return context;
  }

  /**
   * Update manual context JSON
   */
  async updateManualContext(dto: UpdateManualContextDto): Promise<any> {
    const { projectId, contextJson } = dto;

    // Validate project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Upsert context with manual JSON
    const context = await this.prisma.projectContext.upsert({
      where: { projectId },
      create: {
        projectId,
        manualContextJson: contextJson,
        lastManualUpdateAt: new Date(),
      },
      update: {
        manualContextJson: contextJson,
        lastManualUpdateAt: new Date(),
      },
    });

    this.logger.log(`Manual context updated for project ${project.name}`);

    return context;
  }

  /**
   * Get context for a project (merged AI + manual)
   */
  async getContext(projectId: string): Promise<any> {
    const context = await this.prisma.projectContext.findUnique({
      where: { projectId },
    });

    if (!context) {
      return null;
    }

    // Merge AI and manual context
    const mergedContext = {
      ...context,
      fullContext: this.mergeContexts(
        context.aiGeneratedContext,
        context.contextSummary,
        context.manualContextJson,
      ),
    };

    return mergedContext;
  }

  /**
   * Get default context template (downloadable)
   */
  getDefaultTemplate(): any {
    return {
      projectName: "Your Project Name",
      description: "Brief description of what this project does",
      businessRules: [
        {
          rule: "Example business rule",
          description: "Detailed explanation",
          tables: ["table1", "table2"],
        },
      ],
      commonQueries: [
        {
          title: "Example query",
          description: "What this query does",
          sql: "SELECT * FROM table WHERE condition",
          chartType: "bar", // bar, line, pie, etc.
        },
      ],
      terminology: {
        "Technical Term": "Business-friendly explanation",
      },
      metrics: [
        {
          name: "Key Metric Name",
          description: "What this metric measures",
          calculation: "Formula or calculation method",
          tables: ["table1"],
        },
      ],
      relationships: [
        {
          from: "table1",
          to: "table2",
          type: "one-to-many",
          description: "Relationship explanation",
        },
      ],
      bestPractices: [
        "Always filter by date range for performance",
        "Use indexes on commonly queried columns",
      ],
      notes: "Additional context, tips, or warnings",
    };
  }

  /**
   * Build prompt for AI context generation
   */
  private buildContextGenerationPrompt(project: any): string {
    const tables = Array.isArray(project.schema.tables) ? project.schema.tables : [];

    // Create concise schema summary instead of full DDL
    const schemaSummary = this.buildSchemaSummary(tables);

    // Detect domain from table names
    const domainHints = this.detectProjectDomain(tables);

    return `Analyze this database schema and generate a comprehensive project context.

PROJECT: ${project.name}
DESCRIPTION: ${project.description || 'No description provided'}
DETECTED DOMAIN: ${domainHints.domain}
KEY ENTITIES: ${domainHints.entities.join(', ')}

DATABASE SCHEMA SUMMARY:
${schemaSummary}

Generate a detailed context including:
1. Project purpose and domain (${domainHints.domain})
2. Core business entities and their relationships
3. Common query patterns for ${domainHints.domain} analytics
4. Important metrics and KPIs (focus on ${domainHints.entities[0] || 'main entity'})
5. Data relationships and foreign keys
6. Best practices for querying ${domainHints.domain} data
7. Terminology mapping (technical to business terms)
8. Suggested chart types for ${domainHints.domain} visualization

CRITICAL: Prioritize domain-specific tables over generic tables (users, roles, etc).
Example: For surveys, focus on survey_responses, questions, surveys NOT user management tables.

Keep it concise but informative (max 500 words).`;
  }

  /**
   * Detect project domain from table names
   */
  private detectProjectDomain(tables: any[]): { domain: string; entities: string[] } {
    const tableNames = tables.map(t => (t.name || '').toLowerCase());
    const entities: string[] = [];
    let domain = 'General Application';

    // Survey domain detection
    if (tableNames.some(t => t.includes('survey'))) {
      domain = 'Survey & Feedback Management';
      entities.push('surveys', 'questions', 'responses', 'respondents');
    }
    // E-commerce domain
    else if (tableNames.some(t => t.includes('order') || t.includes('product') || t.includes('cart'))) {
      domain = 'E-Commerce';
      entities.push('orders', 'products', 'customers', 'payments');
    }
    // HR/Employee domain
    else if (tableNames.some(t => t.includes('employee') || t.includes('department') || t.includes('attendance'))) {
      domain = 'Human Resources';
      entities.push('employees', 'departments', 'attendance', 'payroll');
    }
    // CRM domain
    else if (tableNames.some(t => t.includes('lead') || t.includes('customer') || t.includes('deal'))) {
      domain = 'Customer Relationship Management';
      entities.push('leads', 'customers', 'deals', 'activities');
    }
    // Default to common entity detection
    else {
      const commonEntities = tables
        .map(t => t.name)
        .filter(name => !['users', 'roles', 'permissions', 'settings', 'logs'].includes(name.toLowerCase()))
        .slice(0, 4);
      entities.push(...commonEntities);
    }

    return { domain, entities };
  }

  /**
   * Build concise schema summary for AI prompt (optimized for speed)
   */
  private buildSchemaSummary(tables: any[]): string {
    if (!tables || tables.length === 0) {
      return 'No tables found in schema.';
    }

    // Sort tables by column count (most important first)
    const sortedTables = [...tables].sort(
      (a, b) => (b.columns?.length || 0) - (a.columns?.length || 0)
    );

    // Take only top 10 tables and minimal columns to keep prompt VERY small
    const topTables = sortedTables.slice(0, 10);
    const remainingCount = tables.length - topTables.length;

    const summary = topTables
      .map((table) => {
        const columns = table.columns || [];
        const pkColumns = columns.filter((c: any) => c.isPrimaryKey);
        const fkColumns = columns.filter((c: any) => c.isForeignKey);

        // Show only PK/FK + first 3 regular columns (ultra-minimal)
        const keyColumns = [
          ...pkColumns.map((c: any) => `${c.name} (PK)`),
          ...fkColumns.slice(0, 2).map((c: any) => `${c.name} (FK)`), // Limit FKs too
          ...columns
            .filter((c: any) => !c.isPrimaryKey && !c.isForeignKey)
            .slice(0, 3)
            .map((c: any) => c.name),
        ];

        return `• ${table.name} (${columns.length} cols): ${keyColumns.slice(0, 6).join(', ')}${
          columns.length > 6 ? '...' : ''
        }`;
      })
      .join('\n');

    const footer =
      remainingCount > 0
        ? `\n\n...and ${remainingCount} more (${tables.length} total)`
        : `\n\nTotal: ${tables.length} tables`;

    return summary + footer;
  }

  /**
   * Call Ollama API
   */
  private async callOllama(prompt: string): Promise<string> {
    try {
      const response = await axios.post(`${this.ollamaUrl}/chat/completions`, {
        model: this.modelName,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
        temperature: 0.3,
        max_tokens: 400, // Reduced from 600 to 400 for faster generation
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error('Failed to call Ollama:', error);
      throw new Error('Failed to generate AI context');
    }
  }

  /**
   * Parse AI-generated context
   */
  private parseAIContext(aiResponse: string): { summary: string } {
    // Extract first 200 characters as summary
    const summary = aiResponse.substring(0, 200).trim() + '...';
    
    return { summary };
  }

  /**
   * Generate initial suggestion prompts from schema
   */
  private generateInitialPrompts(schema: any): string[] {
    const tables = schema.tables || {};
    const tableNames = Object.keys(tables);

    const prompts = [
      "Show me an overview of the data",
      "What are the key metrics?",
    ];

    // Add table-specific prompts
    if (tableNames.length > 0) {
      prompts.push(`Analyze ${tableNames[0]} data`);
      
      if (tableNames.length > 1) {
        prompts.push(`Compare ${tableNames[0]} and ${tableNames[1]}`);
      }
    }

    // Add time-based prompt if date columns exist
    const hasDateColumn = Object.values(tables).some((table: any) => 
      table.columns?.some((col: any) => 
        col.type?.toLowerCase().includes('date') || 
        col.type?.toLowerCase().includes('time')
      )
    );

    if (hasDateColumn) {
      prompts.push("Show trends over time");
    }

    return prompts;
  }

  /**
   * Generate follow-up prompts based on conversation context
   */
  async generateFollowUpPrompts(
    projectId: string,
    conversationHistory: string[],
  ): Promise<string[]> {
    // Get last user message
    const lastMessage = conversationHistory[conversationHistory.length - 1];

    // Basic follow-up suggestions
    const followUps = [
      "Show me more details",
      "Create a chart for this data",
      "Filter by date range",
    ];

    // Context-aware suggestions
    if (lastMessage?.toLowerCase().includes('chart') || lastMessage?.toLowerCase().includes('graph')) {
      followUps.push("Try a different chart type");
      followUps.push("Add more metrics");
    }

    if (lastMessage?.toLowerCase().includes('sql') || lastMessage?.toLowerCase().includes('query')) {
      followUps.push("Optimize this query");
      followUps.push("Explain the query");
    }

    return followUps.slice(0, 4); // Max 4 suggestions
  }

  /**
   * Merge AI and manual contexts
   */
  private mergeContexts(
    aiContext: string | null,
    aiSummary: string | null,
    manualJson: any,
  ): string {
    let merged = '';

    if (aiSummary) {
      merged += `AI Context: ${aiSummary}\n\n`;
    }

    if (manualJson) {
      merged += `Business Rules:\n`;
      
      if (manualJson.businessRules) {
        merged += manualJson.businessRules
          .map((rule: any) => `- ${rule.rule}: ${rule.description}`)
          .join('\n');
        merged += '\n\n';
      }

      if (manualJson.terminology) {
        merged += `Terminology:\n`;
        merged += Object.entries(manualJson.terminology)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join('\n');
        merged += '\n\n';
      }

      if (manualJson.bestPractices) {
        merged += `Best Practices:\n`;
        merged += manualJson.bestPractices
          .map((practice: string) => `- ${practice}`)
          .join('\n');
      }
    }

    return merged.trim() || 'No context available';
  }
}

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { AnalyticsType } from '../dto/analytics-request.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly llm: ChatOpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Use DeepSeek-R1 for analytical reasoning
    this.llm = new ChatOpenAI({
      modelName: 'deepseek-ai/DeepSeek-R1',
      temperature: 0.3,
      maxTokens: 3000,
      configuration: {
        baseURL: this.configService.get('VLLM_DEEPSEEK_R1_URL') || 'http://localhost:8002/v1',
        apiKey: 'EMPTY',
      },
    });
  }

  async analyzeData(projectId: string, type: AnalyticsType, query: string, parameters?: string) {
    // Get project and schema
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        schema: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get recent API usage data for context
    const usageData = await this.getUsageContext(projectId);

    switch (type) {
      case AnalyticsType.PREDICTION:
        return this.generatePrediction(project, query, parameters, usageData);
      case AnalyticsType.TREND:
        return this.analyzeTrend(project, query, parameters, usageData);
      case AnalyticsType.ANOMALY:
        return this.detectAnomalies(project, query, parameters, usageData);
      case AnalyticsType.SUMMARY:
        return this.generateSummary(project, query, parameters, usageData);
      default:
        throw new Error('Invalid analytics type');
    }
  }

  private async generatePrediction(project: any, query: string, parameters?: string, usageData?: string) {
    const prompt = PromptTemplate.fromTemplate(`
You are a data analytics expert. Generate predictions based on the available data and context.

Project: {projectName}
Database Schema: {schema}
Recent Usage Patterns: {usageData}

User Query: {query}
Parameters: {parameters}

Provide:
1. Prediction/Forecast
2. Confidence Level
3. Key Factors
4. Recommendations
5. Suggested SQL queries to gather required data

Format your response as JSON:
{{
  "prediction": "Your prediction here",
  "confidence": "high/medium/low",
  "factors": ["factor1", "factor2"],
  "recommendations": ["rec1", "rec2"],
  "suggestedQueries": ["query1", "query2"]
}}
`);

    try {
      const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

      const result = await chain.invoke({
        projectName: project.name,
        schema: project.schema?.schemaSummary || 'No schema available',
        usageData: usageData || 'No usage data available',
        query,
        parameters: parameters || 'None',
      });

      return this.parseAnalyticsResponse(result, AnalyticsType.PREDICTION);
    } catch (error) {
      this.logger.error('Failed to generate prediction:', error);
      throw new Error('Failed to generate prediction');
    }
  }

  private async analyzeTrend(project: any, query: string, parameters?: string, usageData?: string) {
    const prompt = PromptTemplate.fromTemplate(`
You are a trend analysis expert. Analyze patterns and trends in the data.

Project: {projectName}
Database Schema: {schema}
Recent Usage Patterns: {usageData}

User Query: {query}
Parameters: {parameters}

Provide:
1. Identified Trends
2. Trend Direction (increasing/decreasing/stable)
3. Time Period Analysis
4. Insights
5. Suggested actions

Format your response as JSON:
{{
  "trends": ["trend1", "trend2"],
  "direction": "increasing/decreasing/stable",
  "period": "description",
  "insights": ["insight1", "insight2"],
  "actions": ["action1", "action2"]
}}
`);

    try {
      const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

      const result = await chain.invoke({
        projectName: project.name,
        schema: project.schema?.schemaSummary || 'No schema available',
        usageData: usageData || 'No usage data available',
        query,
        parameters: parameters || 'None',
      });

      return this.parseAnalyticsResponse(result, AnalyticsType.TREND);
    } catch (error) {
      this.logger.error('Failed to analyze trend:', error);
      throw new Error('Failed to analyze trend');
    }
  }

  private async detectAnomalies(project: any, query: string, parameters?: string, usageData?: string) {
    const prompt = PromptTemplate.fromTemplate(`
You are an anomaly detection specialist. Identify unusual patterns or outliers in the data.

Project: {projectName}
Database Schema: {schema}
Recent Usage Patterns: {usageData}

User Query: {query}
Parameters: {parameters}

Provide:
1. Detected Anomalies
2. Severity (critical/high/medium/low)
3. Possible Causes
4. Impact Assessment
5. Recommended Actions

Format your response as JSON:
{{
  "anomalies": ["anomaly1", "anomaly2"],
  "severity": "critical/high/medium/low",
  "causes": ["cause1", "cause2"],
  "impact": "description",
  "actions": ["action1", "action2"]
}}
`);

    try {
      const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

      const result = await chain.invoke({
        projectName: project.name,
        schema: project.schema?.schemaSummary || 'No schema available',
        usageData: usageData || 'No usage data available',
        query,
        parameters: parameters || 'None',
      });

      return this.parseAnalyticsResponse(result, AnalyticsType.ANOMALY);
    } catch (error) {
      this.logger.error('Failed to detect anomalies:', error);
      throw new Error('Failed to detect anomalies');
    }
  }

  private async generateSummary(project: any, query: string, parameters?: string, usageData?: string) {
    const prompt = PromptTemplate.fromTemplate(`
You are a data summarization expert. Generate comprehensive summaries of data and patterns.

Project: {projectName}
Database Schema: {schema}
Recent Usage Patterns: {usageData}

User Query: {query}
Parameters: {parameters}

Provide:
1. Executive Summary
2. Key Metrics
3. Notable Patterns
4. Data Quality Assessment
5. Recommendations

Format your response as JSON:
{{
  "summary": "Executive summary here",
  "metrics": {{"metric1": "value1"}},
  "patterns": ["pattern1", "pattern2"],
  "dataQuality": "assessment",
  "recommendations": ["rec1", "rec2"]
}}
`);

    try {
      const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

      const result = await chain.invoke({
        projectName: project.name,
        schema: project.schema?.schemaSummary || 'No schema available',
        usageData: usageData || 'No usage data available',
        query,
        parameters: parameters || 'None',
      });

      return this.parseAnalyticsResponse(result, AnalyticsType.SUMMARY);
    } catch (error) {
      this.logger.error('Failed to generate summary:', error);
      throw new Error('Failed to generate summary');
    }
  }

  private async getUsageContext(projectId: string): Promise<string> {
    try {
      const recentUsage = await this.prisma.apiUsage.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      if (recentUsage.length === 0) {
        return 'No usage data available yet';
      }

      const summary = {
        totalCalls: recentUsage.length,
        successRate: (recentUsage.filter(u => u.success).length / recentUsage.length * 100).toFixed(2),
        avgResponseTime: (recentUsage.reduce((sum, u) => sum + u.responseTime, 0) / recentUsage.length).toFixed(2),
        topEndpoints: this.getTopEndpoints(recentUsage, 5),
      };

      return JSON.stringify(summary, null, 2);
    } catch (error) {
      this.logger.error('Failed to get usage context:', error);
      return 'Unable to retrieve usage data';
    }
  }

  private getTopEndpoints(usage: any[], limit: number): string[] {
    const endpointCounts = usage.reduce((acc, u) => {
      acc[u.endpoint] = (acc[u.endpoint] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(endpointCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, limit)
      .map(([endpoint]) => endpoint);
  }

  private parseAnalyticsResponse(response: string, type: AnalyticsType): any {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/gi, '').replace(/```\n?/g, '');
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(jsonStr);

      return {
        type,
        result: parsed,
        generatedAt: new Date(),
        metadata: {
          model: 'deepseek-ai/DeepSeek-R1',
          tokensUsed: 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse analytics response:', error);
      // Return raw response if parsing fails
      return {
        type,
        result: { raw: response },
        generatedAt: new Date(),
        metadata: {
          model: 'deepseek-ai/DeepSeek-R1',
          tokensUsed: 0,
        },
      };
    }
  }
}

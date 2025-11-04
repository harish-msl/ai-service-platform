import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogApiUsageDto } from './dto/log-api-usage.dto';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log API usage
   */
  async logUsage(logApiUsageDto: LogApiUsageDto) {
    try {
      const usage = await this.prisma.apiUsage.create({
        data: logApiUsageDto,
      });

      return usage;
    } catch (error) {
      this.logger.error('Failed to log API usage', error);
      // Don't throw error - logging should not break the API
      return null;
    }
  }

  /**
   * Get usage statistics for a project
   */
  async getProjectUsage(projectId: string, startDate?: Date, endDate?: Date) {
    const where: any = { projectId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalCalls, totalTokens, avgResponseTime, successRate, endpointBreakdown] = await Promise.all([
      // Total API calls
      this.prisma.apiUsage.count({ where }),

      // Total tokens used
      this.prisma.apiUsage.aggregate({
        where,
        _sum: { tokensUsed: true },
      }),

      // Average response time
      this.prisma.apiUsage.aggregate({
        where,
        _avg: { responseTime: true },
      }),

      // Success rate
      this.prisma.apiUsage.groupBy({
        by: ['success'],
        where,
        _count: true,
      }),

      // Breakdown by endpoint
      this.prisma.apiUsage.groupBy({
        by: ['endpoint'],
        where,
        _count: true,
        _sum: { tokensUsed: true },
        _avg: { responseTime: true },
        orderBy: { _count: { endpoint: 'desc' } },
      }),
    ]);

    const successCount = successRate.find((s) => s.success)?._count || 0;
    const failureCount = successRate.find((s) => !s.success)?._count || 0;
    const totalRequests = successCount + failureCount;

    return {
      summary: {
        totalCalls,
        totalTokens: totalTokens._sum.tokensUsed || 0,
        avgResponseTime: avgResponseTime._avg.responseTime || 0,
        successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 100,
      },
      endpoints: endpointBreakdown.map((endpoint) => ({
        endpoint: endpoint.endpoint,
        calls: endpoint._count,
        totalTokens: endpoint._sum.tokensUsed || 0,
        avgResponseTime: endpoint._avg.responseTime || 0,
      })),
    };
  }

  /**
   * Get usage statistics for all user's projects
   */
  async getUserUsage(userId: string, startDate?: Date, endDate?: Date) {
    // Get user's projects
    const projects = await this.prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true },
    });

    const projectIds = projects.map((p) => p.id);

    const where: any = { projectId: { in: projectIds } };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalCalls, totalTokens, projectBreakdown] = await Promise.all([
      this.prisma.apiUsage.count({ where }),

      this.prisma.apiUsage.aggregate({
        where,
        _sum: { tokensUsed: true },
      }),

      this.prisma.apiUsage.groupBy({
        by: ['projectId'],
        where,
        _count: true,
        _sum: { tokensUsed: true },
      }),
    ]);

    const projectStats = projectBreakdown.map((stat) => {
      const project = projects.find((p) => p.id === stat.projectId);
      return {
        projectId: stat.projectId,
        projectName: project?.name || 'Unknown',
        calls: stat._count,
        tokens: stat._sum.tokensUsed || 0,
      };
    });

    return {
      summary: {
        totalCalls,
        totalTokens: totalTokens._sum.tokensUsed || 0,
        totalProjects: projects.length,
      },
      projects: projectStats,
    };
  }

  /**
   * Get usage timeline (hourly/daily)
   */
  async getUsageTimeline(projectId: string, interval: 'hour' | 'day' = 'hour', days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usage = await this.prisma.apiUsage.findMany({
      where: {
        projectId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        tokensUsed: true,
        success: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by interval
    const timeline = new Map<string, { calls: number; tokens: number; errors: number }>();

    usage.forEach((record) => {
      const date = new Date(record.createdAt);
      let key: string;

      if (interval === 'hour') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      }

      if (!timeline.has(key)) {
        timeline.set(key, { calls: 0, tokens: 0, errors: 0 });
      }

      const stats = timeline.get(key)!;
      stats.calls += 1;
      stats.tokens += record.tokensUsed;
      if (!record.success) stats.errors += 1;
    });

    return Array.from(timeline.entries()).map(([timestamp, stats]) => ({
      timestamp,
      ...stats,
    }));
  }
}

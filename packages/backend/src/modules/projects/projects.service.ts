import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createProjectDto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        ...createProjectDto,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Project created: ${project.name} (${project.id})`);

    return project;
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      include: {
        apiKeys: {
          select: {
            id: true,
            name: true,
            key: true,
            isActive: true,
            createdAt: true,
          },
        },
        schema: {
          select: {
            id: true,
            projectId: true,
            dialect: true,
            connectionString: true,
            lastSyncedAt: true,
          },
        },
        _count: {
          select: {
            apiKeys: true,
            usage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        apiKeys: {
          select: {
            id: true,
            name: true,
            key: true,
            scopes: true,
            rateLimit: true,
            isActive: true,
            lastUsedAt: true,
            createdAt: true,
          },
        },
        schema: true,
        _count: {
          select: {
            usage: true,
            chatMessages: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  async update(id: string, userId: string, updateProjectDto: UpdateProjectDto) {
    // Check if project exists and user owns it
    await this.findOne(id, userId);

    const project = await this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Project updated: ${project.name} (${project.id})`);

    return project;
  }

  async remove(id: string, userId: string) {
    // Check if project exists and user owns it
    await this.findOne(id, userId);

    await this.prisma.project.delete({
      where: { id },
    });

    this.logger.log(`Project deleted: ${id}`);

    return { message: 'Project deleted successfully' };
  }

  async getProjectStats(id: string, userId: string) {
    const project = await this.findOne(id, userId);

    const [totalApiCalls, totalTokensUsed, averageResponseTime] = await Promise.all([
      this.prisma.apiUsage.count({
        where: { projectId: id },
      }),
      this.prisma.apiUsage.aggregate({
        where: { projectId: id },
        _sum: {
          tokensUsed: true,
        },
      }),
      this.prisma.apiUsage.aggregate({
        where: { projectId: id },
        _avg: {
          responseTime: true,
        },
      }),
    ]);

    return {
      project: {
        id: project.id,
        name: project.name,
      },
      stats: {
        totalApiCalls,
        totalTokensUsed: totalTokensUsed._sum.tokensUsed || 0,
        averageResponseTime: averageResponseTime._avg.responseTime || 0,
        activeApiKeys: project.apiKeys.filter((k) => k.isActive).length,
      },
    };
  }
}

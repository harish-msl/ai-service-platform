import { Injectable, NotFoundException, ForbiddenException, UnauthorizedException, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a secure API key with format: proj_{project_id_8chars}_{environment}_{random_32chars}
   */
  private generateApiKey(projectId: string, environment: string): string {
    const projectPrefix = projectId.substring(0, 8);
    const randomPart = randomBytes(16).toString('hex');
    const envShort = environment.substring(0, 3).toLowerCase();
    
    return `proj_${projectPrefix}_${envShort}_${randomPart}`;
  }

  async create(userId: string, createApiKeyDto: CreateApiKeyDto) {
    const { projectId, name, scopes, rateLimit, expiresAt } = createApiKeyDto;

    // Verify user owns the project
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Generate API key
    const key = this.generateApiKey(projectId, project.environment);

    // Create API key in database
    const apiKey = await this.prisma.apiKey.create({
      data: {
        key,
        name,
        projectId,
        scopes,
        rateLimit: rateLimit || 1000,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            environment: true,
          },
        },
      },
    });

    this.logger.log(`API key created: ${name} for project ${project.name}`);

    return apiKey;
  }

  async findAll(userId: string, projectId?: string) {
    // Build where clause
    const where: any = {};

    if (projectId) {
      // Verify user owns the project
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
      }

      if (project.userId !== userId) {
        throw new ForbiddenException('You do not have access to this project');
      }

      where.projectId = projectId;
    } else {
      // Get all API keys for user's projects
      where.project = {
        userId,
      };
    }

    return this.prisma.apiKey.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            environment: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            environment: true,
            userId: true,
          },
        },
      },
    });

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    if (apiKey.project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this API key');
    }

    return apiKey;
  }

  async update(id: string, userId: string, updateApiKeyDto: UpdateApiKeyDto) {
    // Verify ownership
    await this.findOne(id, userId);

    const apiKey = await this.prisma.apiKey.update({
      where: { id },
      data: updateApiKeyDto,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            environment: true,
          },
        },
      },
    });

    this.logger.log(`API key updated: ${apiKey.name}`);

    return apiKey;
  }

  async revoke(id: string, userId: string) {
    // Verify ownership
    await this.findOne(id, userId);

    const apiKey = await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`API key revoked: ${apiKey.name}`);

    return { message: 'API key revoked successfully' };
  }

  async delete(id: string, userId: string) {
    // Verify ownership
    await this.findOne(id, userId);

    await this.prisma.apiKey.delete({
      where: { id },
    });

    this.logger.log(`API key deleted: ${id}`);

    return { message: 'API key deleted successfully' };
  }

  /**
   * Validate API key and return associated project
   * Used by ApiKeyGuard
   */
  async validateApiKey(key: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key },
      include: {
        project: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!apiKey.isActive) {
      throw new UnauthorizedException('API key is inactive');
    }

    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      throw new UnauthorizedException('API key has expired');
    }

    if (!apiKey.project.isActive) {
      throw new UnauthorizedException('Project is inactive');
    }

    // Update last used timestamp
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      apiKey,
      project: apiKey.project,
      user: apiKey.project.user,
    };
  }

  /**
   * Check if API key has required scope
   */
  hasScope(apiKey: any, requiredScope: string): boolean {
    return apiKey.scopes.includes(requiredScope) || apiKey.scopes.includes('ADMIN');
  }
}

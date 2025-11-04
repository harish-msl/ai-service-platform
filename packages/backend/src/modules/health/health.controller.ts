import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check application health' })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  @ApiResponse({ status: 503, description: 'Application is unhealthy' })
  check() {
    return this.health.check([
      // Database health
      () => this.prismaHealth.pingCheck('database', this.prisma),
      
      // Memory health (heap should not exceed 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      
      // Memory health (RSS should not exceed 300MB)
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      
      // Disk health (storage should have at least 50% free)
      // Use appropriate path based on OS
      () => this.disk.checkStorage('storage', { 
        path: process.platform === 'win32' ? 'C:\\' : '/',
        thresholdPercent: 0.5,
      }),
    ]);
  }

  @Get('ping')
  @ApiOperation({ summary: 'Simple ping check' })
  @ApiResponse({ status: 200, description: 'Pong' })
  ping() {
    return {
      status: 'ok',
      message: 'pong',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}

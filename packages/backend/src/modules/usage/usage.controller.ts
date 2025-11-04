import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Usage & Analytics')
@Controller('usage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('user')
  @ApiOperation({ summary: 'Get usage statistics for all user projects' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Usage statistics retrieved successfully' })
  getUserUsage(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.usageService.getUserUsage(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get usage statistics for a specific project' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Project usage statistics retrieved successfully' })
  getProjectUsage(
    @Param('projectId') projectId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.usageService.getProjectUsage(
      projectId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('project/:projectId/timeline')
  @ApiOperation({ summary: 'Get usage timeline for a project' })
  @ApiQuery({ name: 'interval', required: false, enum: ['hour', 'day'], description: 'Time interval' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look back (default: 7)' })
  @ApiResponse({ status: 200, description: 'Usage timeline retrieved successfully' })
  getUsageTimeline(
    @Param('projectId') projectId: string,
    @Query('interval') interval?: 'hour' | 'day',
    @Query('days') days?: string,
  ) {
    return this.usageService.getUsageTimeline(
      projectId,
      interval || 'hour',
      days ? parseInt(days, 10) : 7,
    );
  }
}

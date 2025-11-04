import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SchemaService } from './schema.service';
import { UploadSchemaDto } from './dto/upload-schema.dto';
import { SyncSchemaDto } from './dto/sync-schema.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Schema')
@Controller('schema')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload database schema manually' })
  @ApiResponse({ status: 201, description: 'Schema successfully uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid schema format' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async uploadSchema(@CurrentUser('id') userId: string, @Body() dto: UploadSchemaDto) {
    return this.schemaService.uploadSchema(userId, dto);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Auto-discover schema from database connection' })
  @ApiResponse({ status: 201, description: 'Schema successfully synced' })
  @ApiResponse({ status: 400, description: 'Invalid connection string or unsupported database' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async syncSchema(@CurrentUser('id') userId: string, @Body() dto: SyncSchemaDto) {
    return this.schemaService.syncSchema(userId, dto);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get schema for a project' })
  @ApiResponse({ status: 200, description: 'Schema retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Schema not found' })
  async getSchema(@Param('projectId') projectId: string, @CurrentUser('id') userId: string) {
    return this.schemaService.getSchema(projectId, userId);
  }

  @Delete('project/:projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete schema for a project' })
  @ApiResponse({ status: 204, description: 'Schema deleted successfully' })
  @ApiResponse({ status: 404, description: 'Schema not found' })
  async deleteSchema(@Param('projectId') projectId: string, @CurrentUser('id') userId: string) {
    await this.schemaService.deleteSchema(projectId, userId);
  }
}

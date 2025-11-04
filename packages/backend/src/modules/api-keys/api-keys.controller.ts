import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@CurrentUser('id') userId: string, @Body() createApiKeyDto: CreateApiKeyDto) {
    return this.apiKeysService.create(userId, createApiKeyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all API keys for user' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by project ID' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  findAll(@CurrentUser('id') userId: string, @Query('projectId') projectId?: string) {
    return this.apiKeysService.findAll(userId, projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific API key' })
  @ApiResponse({ status: 200, description: 'API key retrieved successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.apiKeysService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an API key' })
  @ApiResponse({ status: 200, description: 'API key updated successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
  ) {
    return this.apiKeysService.update(id, userId, updateApiKeyDto);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key (deactivate)' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  revoke(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.apiKeysService.revoke(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an API key permanently' })
  @ApiResponse({ status: 204, description: 'API key deleted successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.apiKeysService.delete(id, userId);
  }
}

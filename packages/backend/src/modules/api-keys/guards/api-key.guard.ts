import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    try {
      const { apiKey: apiKeyData, project, user } = await this.apiKeysService.validateApiKey(apiKey);
      
      // Attach to request for use in controllers
      request.apiKey = apiKeyData;
      request.project = project;
      request.user = user;

      return true;
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Invalid API key');
    }
  }

  private extractApiKey(request: any): string | null {
    // Check X-API-Key header
    const headerKey = request.headers['x-api-key'];
    if (headerKey) {
      return headerKey;
    }

    // Check Authorization header with ApiKey scheme
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('ApiKey ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}

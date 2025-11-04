import { IsString, IsEnum, IsArray, IsOptional, IsNumber, Min, Max, IsDateString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Scope } from '@prisma/client';

export class CreateApiKeyDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Project ID to associate with the API key',
  })
  @IsString()
  projectId: string;

  @ApiProperty({
    example: 'Production API Key',
    description: 'Name/description for the API key',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: ['QUERY_GENERATION', 'CHATBOT'],
    description: 'Scopes/permissions for the API key',
    enum: Scope,
    isArray: true,
  })
  @IsArray()
  @IsEnum(Scope, { each: true })
  scopes: Scope[];

  @ApiPropertyOptional({
    example: 1000,
    description: 'Rate limit (requests per minute)',
    default: 1000,
    minimum: 10,
    maximum: 10000,
  })
  @IsNumber()
  @Min(10)
  @Max(10000)
  @IsOptional()
  rateLimit?: number;

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59Z',
    description: 'Expiration date for the API key (ISO 8601 format)',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

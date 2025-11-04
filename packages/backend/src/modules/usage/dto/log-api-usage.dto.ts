import { IsString, IsNumber, IsBoolean, IsOptional, IsObject } from 'class-validator';

export class LogApiUsageDto {
  @IsString()
  projectId: string;

  @IsString()
  endpoint: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsNumber()
  tokensUsed: number;

  @IsNumber()
  responseTime: number;

  @IsBoolean()
  success: boolean;

  @IsString()
  @IsOptional()
  errorMessage?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}

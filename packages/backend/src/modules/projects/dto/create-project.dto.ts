import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Environment } from '@prisma/client';

export class CreateProjectDto {
  @ApiProperty({
    example: 'E-commerce Analytics',
    description: 'Project name',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'AI-powered analytics for e-commerce platform',
    description: 'Project description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'DEVELOPMENT',
    description: 'Project environment',
    enum: Environment,
    default: Environment.DEVELOPMENT,
  })
  @IsEnum(Environment)
  @IsOptional()
  environment?: Environment;
}

import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateQueryDto {
  @ApiProperty({
    description: 'Natural language question to convert to SQL',
    example: 'Show me all users who registered in the last 30 days',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  question: string;

  @ApiProperty({
    description: 'Project ID to use schema context from',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Additional context or constraints',
    example: 'Only include active users',
    required: false,
  })
  @IsString()
  @IsOptional()
  context?: string;
}

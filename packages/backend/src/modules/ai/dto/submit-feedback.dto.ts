import { IsString, IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitFeedbackDto {
  @ApiProperty({ description: 'Message ID to provide feedback for' })
  @IsString()
  messageId: string;

  @ApiProperty({ description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Feedback rating: -1 (thumbs down), 0 (neutral), 1 (thumbs up)', enum: [-1, 0, 1] })
  @IsInt()
  @Min(-1)
  @Max(1)
  rating: number;

  @ApiPropertyOptional({ description: 'Star rating (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  stars?: number;

  @ApiProperty({ description: 'Whether the response was helpful' })
  @IsBoolean()
  helpful: boolean;

  @ApiPropertyOptional({ description: 'Optional comment about the response' })
  @IsOptional()
  @IsString()
  comment?: string;
}

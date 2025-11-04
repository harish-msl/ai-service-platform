import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AnalyticsType {
  PREDICTION = 'prediction',
  TREND = 'trend',
  ANOMALY = 'anomaly',
  SUMMARY = 'summary',
}

export class AnalyticsRequestDto {
  @ApiProperty({
    description: 'Project ID to analyze',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Type of analytics to perform',
    enum: AnalyticsType,
    example: 'prediction',
  })
  @IsEnum(AnalyticsType)
  type: AnalyticsType;

  @ApiProperty({
    description: 'Specific metric or question to analyze',
    example: 'Predict next month revenue based on current trends',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({
    description: 'Additional parameters or constraints',
    required: false,
    example: 'Use last 90 days of data',
  })
  @IsString()
  @IsOptional()
  parameters?: string;
}

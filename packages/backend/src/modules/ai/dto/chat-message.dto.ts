import { IsString, IsNotEmpty, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({
    description: 'User message content',
    example: 'What are the top selling products this month?',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  message: string;

  @ApiProperty({
    description: 'Conversation ID for context continuity',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({
    description: 'Project ID to use schema context from',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;
}

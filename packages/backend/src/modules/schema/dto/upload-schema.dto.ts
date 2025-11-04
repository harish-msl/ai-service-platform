import { IsString, IsNotEmpty, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DatabaseDialect } from '@prisma/client';

export class UploadSchemaDto {
  @ApiProperty({
    description: 'Project ID to associate the schema with',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Database schema text (SQL DDL)',
    example: 'CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL);',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  schemaText: string;

  @ApiProperty({
    description: 'Database dialect',
    enum: DatabaseDialect,
    example: 'POSTGRESQL',
  })
  @IsEnum(DatabaseDialect)
  dialect: DatabaseDialect;

  @ApiProperty({
    description: 'Optional database connection string for auto-discovery',
    required: false,
    example: 'postgresql://user:password@localhost:5432/mydb',
  })
  @IsString()
  @IsOptional()
  connectionString?: string;
}

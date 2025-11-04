import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncSchemaDto {
  @ApiProperty({
    description: 'Project ID to sync the schema for',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Database connection string',
    example: 'postgresql://user:password@localhost:5432/mydb',
  })
  @IsString()
  @IsNotEmpty()
  connectionString: string;
}

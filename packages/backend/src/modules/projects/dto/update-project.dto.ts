import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Whether the project is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

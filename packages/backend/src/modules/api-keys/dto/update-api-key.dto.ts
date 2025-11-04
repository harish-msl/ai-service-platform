import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateApiKeyDto } from './create-api-key.dto';

// Omit projectId as it shouldn't be updated
export class UpdateApiKeyDto extends PartialType(OmitType(CreateApiKeyDto, ['projectId'] as const)) {}

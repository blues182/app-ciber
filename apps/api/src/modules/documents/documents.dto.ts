import { IsIn, IsOptional, IsString } from 'class-validator';

export const DOCUMENT_ENTITY_TYPES = [
  'trailer',
  'remolque',
  'driver',
  'trip',
  'maintenance',
] as const;

export type DocumentEntityType = (typeof DOCUMENT_ENTITY_TYPES)[number];

export class CreateDocumentDto {
  @IsIn(DOCUMENT_ENTITY_TYPES)
  entityType!: DocumentEntityType;

  @IsString()
  entityId!: string;
}

export class DocumentsQueryDto {
  @IsOptional()
  @IsIn(DOCUMENT_ENTITY_TYPES)
  entityType?: DocumentEntityType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

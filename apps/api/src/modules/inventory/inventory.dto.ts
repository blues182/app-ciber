import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSparePartDto {
  @IsString() sku!: string;
  @IsOptional() @IsString() barcode?: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) stock?: number;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) minimumStock?: number;
  @IsOptional() @IsNumber() @Type(() => Number) unitCost?: number;
}

export class UpdateSparePartDto {
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) minimumStock?: number;
  @IsOptional() @IsNumber() @Type(() => Number) unitCost?: number;
}

export class AdjustStockDto {
  @IsInt() @Type(() => Number) quantity!: number;  // positive = IN, negative = OUT
  @IsString() movementType!: string;              // 'IN' | 'OUT' | 'ADJUSTMENT'
  @IsOptional() @IsString() reason?: string;
}

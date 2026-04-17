import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaintenanceDto {
  @IsString() type!: string;
  @IsString() description!: string;
  @IsDateString() maintenanceDate!: string;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) mileage?: number;
  @IsOptional() @IsString() workshop?: string;
  @IsOptional() @IsNumber() @Type(() => Number) laborCost?: number;
  @IsOptional() @IsString() trailerId?: string;
  @IsOptional() @IsString() remolqueId?: string;
  @IsOptional() @IsString() providerId?: string;
}

export class UpdateMaintenanceDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() maintenanceDate?: string;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) mileage?: number;
  @IsOptional() @IsString() workshop?: string;
  @IsOptional() @IsNumber() @Type(() => Number) laborCost?: number;
  @IsOptional() @IsString() trailerId?: string;
  @IsOptional() @IsString() remolqueId?: string;
  @IsOptional() @IsString() providerId?: string;
}

export class ChangeMaintenanceStatusDto {
  @IsIn(['IN_PROGRESS', 'CLOSED', 'CANCELED']) status!: string;
}

export class AddMaintenancePartDto {
  @IsString() sparePartId!: string;
  @IsInt() @Min(1) @Type(() => Number) quantity!: number;
}

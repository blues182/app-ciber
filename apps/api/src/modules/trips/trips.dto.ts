import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export type TripStatusType = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';

export class CreateTripDto {
  @IsString()
  @MinLength(1)
  orderNumber!: string;

  @IsOptional()
  @IsString()
  folio?: string;

  @IsOptional()
  @IsString()
  cargoType?: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsString()
  clientId!: string;

  @IsString()
  driverId!: string;

  @IsString()
  trailerId!: string;

  @IsOptional()
  @IsString()
  remolqueId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  income?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  dieselLiters?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  dieselCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tollsCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  operatorSalary?: number;
}

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString()
  folio?: string;

  @IsOptional()
  @IsString()
  cargoType?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  trailerId?: string;

  @IsOptional()
  @IsString()
  remolqueId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  income?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  dieselLiters?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  dieselCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tollsCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  operatorSalary?: number;
}

export class AddExpenseDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;

  @IsString()
  @MinLength(1)
  concept!: string;
}

export class ChangeStatusDto {
  @IsIn(['CREATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'])
  status!: TripStatusType;
}

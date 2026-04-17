import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateRemolqueDto {
  @IsString()
  @MinLength(1)
  economicNumber!: string;

  @IsOptional()
  @IsString()
  plates?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mileage?: number;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateRemolqueDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  economicNumber?: string;

  @IsOptional()
  @IsString()
  plates?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mileage?: number;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

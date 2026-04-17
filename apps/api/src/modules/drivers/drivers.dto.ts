import {
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(1)
  licenseNumber!: string;

  @IsDateString()
  licenseExpiry!: string;
}

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsDateString()
  licenseExpiry?: string;
}

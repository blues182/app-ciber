import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  @MinLength(2)
  businessName!: string;

  @IsString()
  @MinLength(1)
  serviceType!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  businessName?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

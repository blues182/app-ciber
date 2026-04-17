import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { AddExpenseDto, ChangeStatusDto, CreateTripDto, UpdateTripDto } from './trips.dto.js';
import { TripsService } from './trips.service.js';

class TripsQueryDto {
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString()
  folio?: string;

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
  @IsIn(['CREATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'])
  status?: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

@Controller('trips')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get('dashboard-stats')
  @RequirePermissions('trips.read')
  getDashboardStats() {
    return this.tripsService.getDashboardStats();
  }

  @Get()
  @RequirePermissions('trips.read')
  findAll(@Query() query: TripsQueryDto) {
    return this.tripsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('trips.read')
  findOne(@Param('id') id: string) {
    return this.tripsService.findOne(id);
  }

  @Post()
  @RequirePermissions('trips.create')
  create(@Body() dto: CreateTripDto, @CurrentUser() user: AuthUser) {
    return this.tripsService.create(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('trips.create')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tripsService.update(id, dto, user.sub);
  }

  @Patch(':id/status')
  @RequirePermissions('trips.create')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tripsService.changeStatus(id, dto, user.sub);
  }

  @Post(':id/expenses')
  @RequirePermissions('trips.create')
  addExpense(
    @Param('id') id: string,
    @Body() dto: AddExpenseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tripsService.addExpense(id, dto, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('trips.create')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tripsService.remove(id, user.sub);
  }
}

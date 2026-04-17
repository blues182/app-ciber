import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { CreateDriverDto, UpdateDriverDto } from './drivers.dto.js';
import { DriversService } from './drivers.service.js';

@Controller('drivers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DriversController {
  constructor(private readonly svc: DriversService) {}

  @Get()
  @RequirePermissions('drivers.read')
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.findAll(search, Number(page ?? 1), Number(pageSize ?? 20));
  }

  @Get(':id')
  @RequirePermissions('drivers.read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @RequirePermissions('drivers.create')
  create(@Body() dto: CreateDriverDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('drivers.create')
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto, @CurrentUser() user: AuthUser) {
    return this.svc.update(id, dto, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('drivers.create')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.remove(id, user.sub);
  }
}

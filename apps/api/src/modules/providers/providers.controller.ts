import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { CreateProviderDto, UpdateProviderDto } from './providers.dto.js';
import { ProvidersService } from './providers.service.js';

@Controller('providers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProvidersController {
  constructor(private readonly svc: ProvidersService) {}

  @Get()
  @RequirePermissions('providers.read')
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.findAll(search, Number(page ?? 1), Number(pageSize ?? 20));
  }

  @Get(':id')
  @RequirePermissions('providers.read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @RequirePermissions('providers.create')
  create(@Body() dto: CreateProviderDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('providers.create')
  update(@Param('id') id: string, @Body() dto: UpdateProviderDto, @CurrentUser() user: AuthUser) {
    return this.svc.update(id, dto, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('providers.create')
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.deactivate(id, user.sub);
  }
}

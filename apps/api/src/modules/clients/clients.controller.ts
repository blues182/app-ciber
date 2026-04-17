import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { CreateClientDto, UpdateClientDto } from './clients.dto.js';
import { ClientsService } from './clients.service.js';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get()
  @RequirePermissions('clients.read')
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.findAll(search, Number(page ?? 1), Number(pageSize ?? 20));
  }

  @Get(':id')
  @RequirePermissions('clients.read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @RequirePermissions('clients.create')
  create(@Body() dto: CreateClientDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('clients.create')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto, @CurrentUser() user: AuthUser) {
    return this.svc.update(id, dto, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('clients.create')
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.deactivate(id, user.sub);
  }
}

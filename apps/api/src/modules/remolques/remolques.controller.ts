import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { CreateRemolqueDto, UpdateRemolqueDto } from './remolques.dto.js';
import { RemolquesService } from './remolques.service.js';

@Controller('remolques')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RemolquesController {
  constructor(private readonly svc: RemolquesService) {}

  @Get()
  @RequirePermissions('trailers.read')
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.findAll(search, Number(page ?? 1), Number(pageSize ?? 20));
  }

  @Get(':id')
  @RequirePermissions('trailers.read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @RequirePermissions('trailers.create')
  create(@Body() dto: CreateRemolqueDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('trailers.create')
  update(@Param('id') id: string, @Body() dto: UpdateRemolqueDto, @CurrentUser() user: AuthUser) {
    return this.svc.update(id, dto, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('trailers.create')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.remove(id, user.sub);
  }
}

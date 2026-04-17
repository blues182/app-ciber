import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { CreateTrailerDto, UpdateTrailerDto } from './trailers.dto.js';
import { TrailersService } from './trailers.service.js';

@Controller('trailers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TrailersController {
  constructor(private readonly svc: TrailersService) {}

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
  create(@Body() dto: CreateTrailerDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('trailers.create')
  update(@Param('id') id: string, @Body() dto: UpdateTrailerDto, @CurrentUser() user: AuthUser) {
    return this.svc.update(id, dto, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('trailers.create')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.remove(id, user.sub);
  }
}

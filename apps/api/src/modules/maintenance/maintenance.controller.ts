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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthUser } from '../../common/decorators/current-user.decorator.js';
import {
  AddMaintenancePartDto,
  ChangeMaintenanceStatusDto,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
} from './maintenance.dto.js';
import { MaintenanceService } from './maintenance.service.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly svc: MaintenanceService) {}

  @Get()
  @RequirePermissions('maintenance.read')
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.svc.findAll(search, status, page ? Number(page) : 1);
  }

  @Get(':id')
  @RequirePermissions('maintenance.read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @RequirePermissions('maintenance.create')
  create(@Body() dto: CreateMaintenanceDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('maintenance.create')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.update(id, dto, user.sub);
  }

  @Patch(':id/status')
  @RequirePermissions('maintenance.create')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeMaintenanceStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.changeStatus(id, dto, user.sub);
  }

  @Post(':id/parts')
  @RequirePermissions('maintenance.create')
  addPart(
    @Param('id') id: string,
    @Body() dto: AddMaintenancePartDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.addPart(id, dto, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('maintenance.create')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.remove(id, user.sub);
  }
}

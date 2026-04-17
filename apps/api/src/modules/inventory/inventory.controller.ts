import {
  Body,
  Controller,
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
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator.js';
import { AdjustStockDto, CreateSparePartDto, UpdateSparePartDto } from './inventory.dto.js';
import { InventoryService } from './inventory.service.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  @Get('alerts/low-stock')
  @RequirePermissions('inventory.read')
  getLowStock() {
    return this.svc.getLowStockAlerts();
  }

  @Get()
  @RequirePermissions('inventory.read')
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
  ) {
    return this.svc.findAllParts(search, page ? Number(page) : 1);
  }

  @Get(':id')
  @RequirePermissions('inventory.read')
  findOne(@Param('id') id: string) {
    return this.svc.findOnePart(id);
  }

  @Post()
  @RequirePermissions('inventory.create')
  create(@Body() dto: CreateSparePartDto, @CurrentUser() user: AuthUser) {
    return this.svc.createPart(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('inventory.create')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSparePartDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.updatePart(id, dto, user.sub);
  }

  @Post(':id/adjust')
  @RequirePermissions('inventory.create')
  adjust(
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.adjustStock(id, dto, user.sub);
  }

  @Get(':id/movements')
  @RequirePermissions('inventory.read')
  getMovements(
    @Param('id') id: string,
    @Query('page') page?: string,
  ) {
    return this.svc.getMovements(id, page ? Number(page) : 1);
  }
}

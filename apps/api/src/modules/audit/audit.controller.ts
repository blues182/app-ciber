import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { AuditService } from './audit.service.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit.read')
  findAll(
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.auditService.findAll({
      module,
      action,
      userId,
      from,
      to,
      page: Number(page ?? 1),
      pageSize: Number(pageSize ?? 30),
    });
  }
}

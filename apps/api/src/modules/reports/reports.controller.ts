import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { ReportsService } from './reports.service.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @RequirePermissions('reports.read')
  overview(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getOverview(from, to);
  }

  @Get('export')
  @RequirePermissions('reports.read')
  async export(
    @Query('dataset') dataset: string,
    @Query('format') format: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.reportsService.exportDataset(dataset, format, from, to);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.send(file.buffer);
  }
}

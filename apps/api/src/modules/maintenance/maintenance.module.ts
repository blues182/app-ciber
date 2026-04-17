import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { MaintenanceController } from './maintenance.controller.js';
import { MaintenanceService } from './maintenance.service.js';

@Module({
  imports: [AuditModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}

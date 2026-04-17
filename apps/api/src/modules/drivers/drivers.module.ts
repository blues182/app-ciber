import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { DriversController } from './drivers.controller.js';
import { DriversService } from './drivers.service.js';

@Module({
  imports: [AuditModule],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}

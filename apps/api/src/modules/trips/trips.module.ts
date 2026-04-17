import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { TripsController } from './trips.controller.js';
import { TripsService } from './trips.service.js';

@Module({
  imports: [AuditModule],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}

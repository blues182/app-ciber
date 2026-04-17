import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { ProvidersController } from './providers.controller.js';
import { ProvidersService } from './providers.service.js';

@Module({
  imports: [AuditModule],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}

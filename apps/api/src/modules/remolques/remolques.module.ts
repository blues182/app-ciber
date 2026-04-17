import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { RemolquesController } from './remolques.controller.js';
import { RemolquesService } from './remolques.service.js';

@Module({
  imports: [AuditModule],
  controllers: [RemolquesController],
  providers: [RemolquesService],
  exports: [RemolquesService],
})
export class RemolquesModule {}

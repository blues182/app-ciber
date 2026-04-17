import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { TrailersController } from './trailers.controller.js';
import { TrailersService } from './trailers.service.js';

@Module({
  imports: [AuditModule],
  controllers: [TrailersController],
  providers: [TrailersService],
  exports: [TrailersService],
})
export class TrailersModule {}

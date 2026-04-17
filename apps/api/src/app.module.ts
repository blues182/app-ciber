import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ClientsModule } from './modules/clients/clients.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { DriversModule } from './modules/drivers/drivers.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { ProvidersModule } from './modules/providers/providers.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { RemolquesModule } from './modules/remolques/remolques.module.js';
import { TrailersModule } from './modules/trailers/trailers.module.js';
import { TripsModule } from './modules/trips/trips.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TripsModule,
    TrailersModule,
    RemolquesModule,
    DriversModule,
    ClientsModule,
    ProvidersModule,
    MaintenanceModule,
    InventoryModule,
    ReportsModule,
    DocumentsModule,
  ],
})
export class AppModule {}

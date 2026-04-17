import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

interface ReportRow {
  [key: string]: string | number | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(from?: string, to?: string) {
    const tripDate = this.buildDateRange('startDate', from, to);
    const maintenanceDate = this.buildDateRange('maintenanceDate', from, to);
    const movementDate = this.buildDateRange('createdAt', from, to);

    const [trips, maintenance, inventoryMovements] = await Promise.all([
      this.prisma.trip.findMany({ where: tripDate }),
      this.prisma.maintenance.findMany({ where: maintenanceDate }),
      this.prisma.inventoryMovement.findMany({ where: movementDate }),
    ]);

    const totalIncome = trips.reduce((sum: number, item: { income: unknown }) => sum + Number(item.income), 0);
    const totalExpenses = trips.reduce((sum: number, item: { expenses: unknown }) => sum + Number(item.expenses), 0);
    const totalUtility = trips.reduce((sum: number, item: { utility: unknown }) => sum + Number(item.utility), 0);
    const totalMaintenance = maintenance.reduce((sum: number, item: { totalCost: unknown }) => sum + Number(item.totalCost), 0);
    const inventoryOut = inventoryMovements
      .filter((item: { movementType: string }) => item.movementType === 'OUT')
      .reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);

    return {
      trips: {
        total: trips.length,
        totalIncome,
        totalExpenses,
        totalUtility,
      },
      maintenance: {
        total: maintenance.length,
        totalCost: totalMaintenance,
        closed: maintenance.filter((item: { status: string }) => item.status === 'CLOSED').length,
      },
      inventory: {
        totalMovements: inventoryMovements.length,
        stockOutUnits: inventoryOut,
      },
    };
  }

  async exportDataset(dataset: string, format: string, from?: string, to?: string) {
    const { rows, title } = await this.getDatasetRows(dataset, from, to);

    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31));
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return {
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileName: `${dataset}-report.xlsx`,
        buffer: Buffer.from(buffer),
      };
    }

    if (format === 'pdf') {
      const buffer = await this.buildPdf(title, rows);
      return {
        contentType: 'application/pdf',
        fileName: `${dataset}-report.pdf`,
        buffer,
      };
    }

    throw new BadRequestException('Formato no soportado. Usa xlsx o pdf.');
  }

  private buildDateRange(field: string, from?: string, to?: string) {
    if (!from && !to) return {};
    return {
      [field]: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    };
  }

  private async getDatasetRows(dataset: string, from?: string, to?: string) {
    if (dataset === 'trips') {
      const items = await this.prisma.trip.findMany({
        where: this.buildDateRange('startDate', from, to),
        include: {
          client: { select: { businessName: true } },
          driver: { select: { fullName: true } },
          trailer: { select: { economicNumber: true } },
        },
        orderBy: { startDate: 'desc' },
      });
      return {
        title: 'Reporte de viajes',
        rows: items.map((item: {
          orderNumber: string;
          folio: string | null;
          status: string;
          startDate: Date;
          endDate: Date | null;
          client: { businessName: string };
          driver: { fullName: string };
          trailer: { economicNumber: string };
          income: unknown;
          expenses: unknown;
          utility: unknown;
        }) => ({
          orderNumber: item.orderNumber,
          folio: item.folio,
          status: item.status,
          startDate: item.startDate.toISOString().slice(0, 10),
          endDate: item.endDate?.toISOString().slice(0, 10) ?? null,
          client: item.client.businessName,
          driver: item.driver.fullName,
          trailer: item.trailer.economicNumber,
          income: Number(item.income),
          expenses: Number(item.expenses),
          utility: Number(item.utility),
        })),
      };
    }

    if (dataset === 'maintenance') {
      const items = await this.prisma.maintenance.findMany({
        where: this.buildDateRange('maintenanceDate', from, to),
        include: {
          trailer: { select: { economicNumber: true } },
          remolque: { select: { economicNumber: true } },
          provider: { select: { businessName: true } },
        },
        orderBy: { maintenanceDate: 'desc' },
      });
      return {
        title: 'Reporte de mantenimiento',
        rows: items.map((item: {
          type: string;
          status: string;
          maintenanceDate: Date;
          trailer: { economicNumber: string } | null;
          remolque: { economicNumber: string } | null;
          provider: { businessName: string } | null;
          laborCost: unknown;
          partsCost: unknown;
          totalCost: unknown;
        }) => ({
          type: item.type,
          status: item.status,
          maintenanceDate: item.maintenanceDate.toISOString().slice(0, 10),
          unit: item.trailer?.economicNumber ?? item.remolque?.economicNumber ?? null,
          provider: item.provider?.businessName ?? null,
          laborCost: Number(item.laborCost),
          partsCost: Number(item.partsCost),
          totalCost: Number(item.totalCost),
        })),
      };
    }

    if (dataset === 'inventory') {
      const items = await this.prisma.inventoryMovement.findMany({
        where: this.buildDateRange('createdAt', from, to),
        include: {
          sparePart: { select: { sku: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return {
        title: 'Reporte de inventario',
        rows: items.map((item: {
          createdAt: Date;
          movementType: string;
          quantity: number;
          reason: string | null;
          sparePart: { sku: string; name: string };
        }) => ({
          createdAt: item.createdAt.toISOString(),
          sku: item.sparePart.sku,
          partName: item.sparePart.name,
          movementType: item.movementType,
          quantity: item.quantity,
          reason: item.reason,
        })),
      };
    }

    throw new BadRequestException('Dataset no soportado. Usa trips, maintenance o inventory.');
  }

  private buildPdf(title: string, rows: ReportRow[]) {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text(title, { underline: true });
      doc.moveDown();

      if (rows.length === 0) {
        doc.fontSize(11).text('Sin datos para el rango seleccionado.');
        doc.end();
        return;
      }

      const headers = Object.keys(rows[0]);
      doc.fontSize(9).text(headers.join(' | '));
      doc.moveDown(0.5);

      for (const row of rows) {
        const line = headers
          .map((header) => String(row[header] ?? ''))
          .join(' | ')
          .slice(0, 170);
        doc.text(line, { width: 520 });
      }

      doc.end();
    });
  }
}

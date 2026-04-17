import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdjustStockDto, CreateSparePartDto, UpdateSparePartDto } from './inventory.dto.js';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Spare Parts ─────────────────────────────────────────────────────────────

  async findAllParts(search?: string, page = 1, pageSize = 20) {
    const where = search
      ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.sparePart.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sparePart.count({ where }),
    ]);
    return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOnePart(id: string) {
    const part = await this.prisma.sparePart.findUnique({ where: { id } });
    if (!part) throw new NotFoundException(`Refacción ${id} no encontrada.`);
    return part;
  }

  async createPart(dto: CreateSparePartDto, userId: string) {
    const exists = await this.prisma.sparePart.findUnique({ where: { sku: dto.sku } });
    if (exists) throw new ConflictException(`SKU ${dto.sku} ya existe.`);

    const barcode = dto.barcode?.trim()
      ? dto.barcode.trim()
      : await this.generateBarcode(dto.sku, dto.name);

    const barcodeConflict = await this.prisma.sparePart.findFirst({
      where: { barcode },
      select: { id: true },
    });
    if (barcodeConflict) throw new ConflictException(`Código de barras ${barcode} ya existe.`);

    const part = await this.prisma.sparePart.create({
      data: {
        sku: dto.sku,
        barcode,
        name: dto.name,
        description: dto.description,
        stock: dto.stock ?? 0,
        minimumStock: dto.minimumStock ?? 0,
        unitCost: dto.unitCost ?? 0,
      },
    });

    // Record initial stock movement if stock > 0
    if (part.stock > 0) {
      await this.prisma.inventoryMovement.create({
        data: { sparePartId: part.id, quantity: part.stock, movementType: 'IN', reason: 'Stock inicial' },
      });
    }

    await this.audit.log(userId, 'inventory', 'CREATE', part.id, { sku: dto.sku });
    return part;
  }

  async updatePart(id: string, dto: UpdateSparePartDto, userId: string) {
    await this.findOnePart(id);
    if (dto.sku) {
      const conflict = await this.prisma.sparePart.findFirst({
        where: { sku: dto.sku, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`SKU ${dto.sku} ya existe.`);
    }

    if (dto.barcode !== undefined) {
      const nextBarcode = dto.barcode.trim();
      if (nextBarcode.length > 0) {
        const conflict = await this.prisma.sparePart.findFirst({
          where: { barcode: nextBarcode, NOT: { id } },
          select: { id: true },
        });
        if (conflict) throw new ConflictException(`Código de barras ${nextBarcode} ya existe.`);
      }
    }

    const updated = await this.prisma.sparePart.update({
      where: { id },
      data: {
        ...(dto.sku !== undefined && { sku: dto.sku }),
        ...(dto.barcode !== undefined && { barcode: dto.barcode.trim() || null }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.minimumStock !== undefined && { minimumStock: dto.minimumStock }),
        ...(dto.unitCost !== undefined && { unitCost: dto.unitCost }),
      },
    });
    await this.audit.log(userId, 'inventory', 'UPDATE', id);
    return updated;
  }

  // ── Stock Adjustments ───────────────────────────────────────────────────────

  async adjustStock(id: string, dto: AdjustStockDto, userId: string) {
    const part = await this.findOnePart(id);
    const newStock = part.stock + dto.quantity;
    if (newStock < 0) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${part.stock}, ajuste: ${dto.quantity}.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.sparePart.update({
        where: { id },
        data: { stock: { increment: dto.quantity } },
      }),
      this.prisma.inventoryMovement.create({
        data: {
          sparePartId: id,
          quantity: Math.abs(dto.quantity),
          movementType: dto.movementType,
          reason: dto.reason,
        },
      }),
    ]);

    await this.audit.log(userId, 'inventory', 'INVENTORY_MOVEMENT', id, {
      quantity: dto.quantity,
      movementType: dto.movementType,
    });

    return this.findOnePart(id);
  }

  // ── Movements ───────────────────────────────────────────────────────────────

  async getMovements(sparePartId: string, page = 1, pageSize = 30) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.findMany({
        where: { sparePartId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.inventoryMovement.count({ where: { sparePartId } }),
    ]);
    return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async getLowStockAlerts() {
    // column-to-column comparison requires raw query
    return this.prisma.$queryRaw<{ id: string; sku: string; name: string; stock: number; minimumStock: number }[]>`
      SELECT id, sku, name, stock, minimumStock, unitCost
      FROM SparePart
      WHERE stock <= minimumStock
      ORDER BY stock ASC
    `;
  }

  private async generateBarcode(sku: string, name: string) {
    const skuPart = sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) || 'SKU';
    const namePart = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) || 'PART';

    for (let i = 0; i < 10; i += 1) {
      const stamp = Date.now().toString(36).toUpperCase();
      const random = Math.floor(Math.random() * 36 ** 2).toString(36).toUpperCase().padStart(2, '0');
      const candidate = `BRC-${skuPart}-${namePart}-${stamp}${random}`;
      const exists = await this.prisma.sparePart.findFirst({
        where: { barcode: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }

    throw new ConflictException('No fue posible generar un código de barras único. Intenta de nuevo.');
  }
}

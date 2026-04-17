import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AddMaintenancePartDto,
  ChangeMaintenanceStatusDto,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
} from './maintenance.dto.js';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    search?: string,
    status?: string,
    page = 1,
    pageSize = 20,
  ) {
    const where: Record<string, unknown> = {};
    if (search) {
      where['OR'] = [
        { type: { contains: search } },
        { description: { contains: search } },
        { trailer: { is: { economicNumber: { contains: search } } } },
        { remolque: { is: { economicNumber: { contains: search } } } },
      ];
    }
    if (status) where['status'] = status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.maintenance.findMany({
        where,
        include: {
          trailer: { select: { id: true, economicNumber: true } },
          remolque: { select: { id: true, economicNumber: true } },
          provider: { select: { businessName: true } },
          partsUsed: { include: { sparePart: { select: { sku: true, name: true } } } },
        },
        orderBy: { maintenanceDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.maintenance.count({ where }),
    ]);

    return {
      items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: string) {
    const m = await this.prisma.maintenance.findUnique({
      where: { id },
      include: {
        trailer: { select: { id: true, economicNumber: true } },
        remolque: { select: { id: true, economicNumber: true } },
        provider: { select: { businessName: true } },
        partsUsed: { include: { sparePart: { select: { sku: true, name: true, unitCost: true } } } },
      },
    });
    if (!m) throw new NotFoundException(`Mantenimiento ${id} no encontrado.`);
    return m;
  }

  async create(dto: CreateMaintenanceDto, userId: string) {
    const trailerId = dto.trailerId?.trim() || undefined;
    const remolqueId = dto.remolqueId?.trim() || undefined;
    if (trailerId && remolqueId) {
      throw new BadRequestException('Selecciona solo una unidad: carro o remolque.');
    }

    const data: Record<string, unknown> = {
      type: dto.type,
      description: dto.description,
      maintenanceDate: new Date(dto.maintenanceDate),
      laborCost: dto.laborCost ?? 0,
    };
    if (dto.mileage !== undefined) data['mileage'] = dto.mileage;
    if (dto.workshop) data['workshop'] = dto.workshop;
    if (trailerId) data['trailerId'] = trailerId;
    if (remolqueId) data['remolqueId'] = remolqueId;
    if (dto.providerId) data['providerId'] = dto.providerId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maintenance = await this.prisma.maintenance.create({ data: data as any });
    await this.audit.log(userId, 'maintenance', 'CREATE', maintenance.id, { type: dto.type });
    return maintenance;
  }

  async update(id: string, dto: UpdateMaintenanceDto, userId: string) {
    const m = await this.findOne(id);
    if (m.status === 'CLOSED' || m.status === 'CANCELED') {
      throw new BadRequestException('No se puede editar un mantenimiento cerrado o cancelado.');
    }

    const nextTrailerId = dto.trailerId === undefined
      ? (m.trailer?.id ?? null)
      : (dto.trailerId.trim() || null);
    const nextRemolqueId = dto.remolqueId === undefined
      ? (m.remolque?.id ?? null)
      : (dto.remolqueId.trim() || null);
    if (nextTrailerId && nextRemolqueId) {
      throw new BadRequestException('Selecciona solo una unidad: carro o remolque.');
    }

    const data: Record<string, unknown> = {};
    if (dto.type !== undefined) data['type'] = dto.type;
    if (dto.description !== undefined) data['description'] = dto.description;
    if (dto.maintenanceDate !== undefined) data['maintenanceDate'] = new Date(dto.maintenanceDate);
    if (dto.mileage !== undefined) data['mileage'] = dto.mileage;
    if (dto.workshop !== undefined) data['workshop'] = dto.workshop;
    if (dto.laborCost !== undefined) data['laborCost'] = dto.laborCost;
    if (dto.trailerId !== undefined) data['trailerId'] = nextTrailerId;
    if (dto.remolqueId !== undefined) data['remolqueId'] = nextRemolqueId;
    if (dto.providerId !== undefined) data['providerId'] = dto.providerId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await this.prisma.maintenance.update({ where: { id }, data: data as any });
    await this.audit.log(userId, 'maintenance', 'UPDATE', id);
    return updated;
  }

  async changeStatus(id: string, dto: ChangeMaintenanceStatusDto, userId: string) {
    const m = await this.findOne(id);
    if (m.status === 'CLOSED' || m.status === 'CANCELED') {
      throw new BadRequestException('El mantenimiento ya está finalizado.');
    }

    const updates: Record<string, unknown> = { status: dto.status };

    // On close: recalculate totalCost = laborCost + partsCost
    if (dto.status === 'CLOSED') {
      const partsCost = m.partsUsed.reduce(
        (sum: number, p: { unitCost: unknown; quantity: number }) => sum + Number(p.unitCost) * p.quantity,
        0,
      );
      updates['partsCost'] = partsCost;
      updates['totalCost'] = Number(m.laborCost) + partsCost;
    }

    const updated = await this.prisma.maintenance.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: updates as any,
    });

    const action = dto.status === 'CLOSED' ? 'MAINTENANCE_CLOSE' : 'UPDATE';
    await this.audit.log(userId, 'maintenance', action, id, { status: dto.status });
    return updated;
  }

  /**
   * RN-06: add part to maintenance — auto-deducts from SparePart stock
   * Records an INVENTORY_MOVEMENT of type 'OUT'
   */
  async addPart(id: string, dto: AddMaintenancePartDto, userId: string) {
    const m = await this.findOne(id);
    if (m.status === 'CLOSED' || m.status === 'CANCELED') {
      throw new BadRequestException('No se pueden agregar piezas a un mantenimiento cerrado.');
    }

    const sparePart = await this.prisma.sparePart.findUnique({
      where: { id: dto.sparePartId },
    });
    if (!sparePart) throw new NotFoundException(`Refacción ${dto.sparePartId} no encontrada.`);

    // RN-06: check stock
    if (sparePart.stock < dto.quantity) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${sparePart.stock}, solicitado: ${dto.quantity}.`,
      );
    }

    // Upsert MaintenancePart + deduct stock + record movement atomically
    await this.prisma.$transaction(async (tx) => {
      // Check if part already added
      const existing = await tx.maintenancePart.findUnique({
        where: { maintenanceId_sparePartId: { maintenanceId: id, sparePartId: dto.sparePartId } },
      });

      const newQty = existing ? existing.quantity + dto.quantity : dto.quantity;

      await tx.maintenancePart.upsert({
        where: { maintenanceId_sparePartId: { maintenanceId: id, sparePartId: dto.sparePartId } },
        create: {
          maintenanceId: id,
          sparePartId: dto.sparePartId,
          quantity: dto.quantity,
          unitCost: sparePart.unitCost,
        },
        update: { quantity: newQty },
      });

      // Deduct stock
      await tx.sparePart.update({
        where: { id: dto.sparePartId },
        data: { stock: { decrement: dto.quantity } },
      });

      // Record movement
      await tx.inventoryMovement.create({
        data: {
          sparePartId: dto.sparePartId,
          quantity: dto.quantity,
          movementType: 'OUT',
          reason: `Mantenimiento ${id}`,
        },
      });
    });

    await this.audit.log(userId, 'maintenance', 'INVENTORY_MOVEMENT', id, {
      sparePartId: dto.sparePartId,
      quantity: dto.quantity,
    });

    return this.findOne(id);
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.maintenancePart.deleteMany({ where: { maintenanceId: id } });
      await tx.document.deleteMany({ where: { maintenanceId: id } });
      await tx.maintenance.delete({ where: { id } });
    });

    await this.audit.log(userId, 'maintenance', 'DELETE', id);
    return { ok: true };
  }
}

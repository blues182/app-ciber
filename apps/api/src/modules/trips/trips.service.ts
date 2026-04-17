import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type AuditActionType, AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AddExpenseDto,
  ChangeStatusDto,
  CreateTripDto,
  TripStatusType,
  UpdateTripDto,
} from './trips.dto.js';

export interface TripFilters {
  orderNumber?: string;
  folio?: string;
  clientId?: string;
  driverId?: string;
  trailerId?: string;
  status?: TripStatusType;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

const TRIP_INCLUDE = {
  client: { select: { id: true, businessName: true } },
  driver: { select: { id: true, fullName: true } },
  trailer: { select: { id: true, economicNumber: true, plates: true } },
  remolque: { select: { id: true, economicNumber: true } },
} as const;

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(filters: TripFilters) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      ...(filters.orderNumber
        ? { orderNumber: { contains: filters.orderNumber } }
        : {}),
      ...(filters.folio ? { folio: { contains: filters.folio } } : {}),
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.driverId ? { driverId: filters.driverId } : {}),
      ...(filters.trailerId ? { trailerId: filters.trailerId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.startDate || filters.endDate
        ? {
            startDate: {
              ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
              ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        include: TRIP_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.trip.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: TRIP_INCLUDE,
    });
    if (!trip) throw new NotFoundException(`Viaje ${id} no encontrado.`);
    return trip;
  }

  async create(dto: CreateTripDto, userId: string) {
    await this.validateTripReferences({
      clientId: dto.clientId,
      driverId: dto.driverId,
      trailerId: dto.trailerId,
      remolqueId: dto.remolqueId,
    });

    const income = dto.income ?? 0;
    const distanceKm = dto.distanceKm ?? 0;
    const dieselLiters = dto.dieselLiters ?? 0;
    const dieselCost = dto.dieselCost ?? 0;
    const tollsCost = dto.tollsCost ?? 0;
    const operatorSalary = dto.operatorSalary ?? 0;
    const otherExpenses = 0;
    const { expenses, utility } = this.computeFinancials({
      income,
      dieselCost,
      tollsCost,
      operatorSalary,
      otherExpenses,
    });

    const trip = await this.prisma.trip.create({
      data: {
        orderNumber: dto.orderNumber,
        folio: dto.folio,
        cargoType: dto.cargoType,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        distanceKm,
        dieselLiters,
        dieselCost,
        tollsCost,
        operatorSalary,
        otherExpenses,
        income,
        expenses,
        utility,
        clientId: dto.clientId,
        driverId: dto.driverId,
        trailerId: dto.trailerId,
        remolqueId: dto.remolqueId,
      },
      include: TRIP_INCLUDE,
    });
    await this.audit.log(userId, 'trips', 'CREATE' as AuditActionType, trip.id, {
      orderNumber: trip.orderNumber,
    });
    return trip;
  }

  async update(id: string, dto: UpdateTripDto, userId: string) {
    const trip = await this.findOne(id);
    if (trip.status === 'COMPLETED' || trip.status === 'CANCELED') {
      throw new BadRequestException(
        'No se puede editar un viaje completado o cancelado.',
      );
    }
    await this.validateTripReferences({
      clientId: dto.clientId ?? trip.clientId,
      driverId: dto.driverId ?? trip.driverId,
      trailerId: dto.trailerId ?? trip.trailerId,
      remolqueId: dto.remolqueId === undefined ? trip.remolqueId : dto.remolqueId,
    });

    const income = dto.income ?? Number(trip.income);
    const distanceKm = dto.distanceKm ?? Number(trip.distanceKm);
    const dieselLiters = dto.dieselLiters ?? Number(trip.dieselLiters);
    const dieselCost = dto.dieselCost ?? Number(trip.dieselCost);
    const tollsCost = dto.tollsCost ?? Number(trip.tollsCost);
    const operatorSalary = dto.operatorSalary ?? Number(trip.operatorSalary);
    const otherExpenses = Number(trip.otherExpenses);
    const { expenses, utility } = this.computeFinancials({
      income,
      dieselCost,
      tollsCost,
      operatorSalary,
      otherExpenses,
    });

    const updated = await this.prisma.trip.update({
      where: { id },
      data: {
        ...(dto.orderNumber ? { orderNumber: dto.orderNumber } : {}),
        ...(dto.folio !== undefined ? { folio: dto.folio } : {}),
        ...(dto.cargoType !== undefined ? { cargoType: dto.cargoType } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        income,
        distanceKm,
        dieselLiters,
        dieselCost,
        tollsCost,
        operatorSalary,
        expenses,
        utility,
        ...(dto.clientId ? { clientId: dto.clientId } : {}),
        ...(dto.driverId ? { driverId: dto.driverId } : {}),
        ...(dto.trailerId ? { trailerId: dto.trailerId } : {}),
        ...(dto.remolqueId !== undefined ? { remolqueId: dto.remolqueId } : {}),
      },
      include: TRIP_INCLUDE,
    });
    await this.audit.log(userId, 'trips', 'UPDATE' as AuditActionType, id);
    return updated;
  }

  async changeStatus(id: string, dto: ChangeStatusDto, userId: string) {
    await this.findOne(id);
    const data: Record<string, unknown> = { status: dto.status };
    if (dto.status === 'COMPLETED') {
      data.endDate = new Date();
    }
    const updated = await this.prisma.trip.update({
      where: { id },
      data,
      include: TRIP_INCLUDE,
    });
    const auditAction: AuditActionType =
      dto.status === 'COMPLETED' ? 'TRIP_CLOSE' : 'UPDATE';
    await this.audit.log(userId, 'trips', auditAction, id, {
      status: dto.status,
    });
    // Recalculate utility on close
    if (dto.status === 'COMPLETED') {
      return this.recalcUtility(id);
    }
    return updated;
  }

  async addExpense(id: string, dto: AddExpenseDto, userId: string) {
    const trip = await this.findOne(id);
    if (trip.status === 'COMPLETED' || trip.status === 'CANCELED') {
      throw new BadRequestException(
        'No se pueden agregar gastos a un viaje cerrado o cancelado.',
      );
    }
    const otherExpenses = Number(trip.otherExpenses) + dto.amount;
    const { expenses, utility } = this.computeFinancials({
      income: Number(trip.income),
      dieselCost: Number(trip.dieselCost),
      tollsCost: Number(trip.tollsCost),
      operatorSalary: Number(trip.operatorSalary),
      otherExpenses,
    });

    const updated = await this.prisma.trip.update({
      where: { id },
      data: { otherExpenses, expenses, utility },
      include: TRIP_INCLUDE,
    });
    await this.audit.log(userId, 'trips', 'UPDATE' as AuditActionType, id, {
      expense: dto.concept,
      amount: dto.amount,
    });
    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.document.deleteMany({ where: { tripId: id } });
      await tx.trip.delete({ where: { id } });
    });
    await this.audit.log(userId, 'trips', 'DELETE' as AuditActionType, id);
    return { ok: true };
  }

  private async recalcUtility(id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) return null;
    const { expenses, utility } = this.computeFinancials({
      income: Number(trip.income),
      dieselCost: Number(trip.dieselCost),
      tollsCost: Number(trip.tollsCost),
      operatorSalary: Number(trip.operatorSalary),
      otherExpenses: Number(trip.otherExpenses),
    });
    return this.prisma.trip.update({
      where: { id },
      data: { expenses, utility },
      include: TRIP_INCLUDE,
    });
  }

  private computeFinancials(input: {
    income: number;
    dieselCost: number;
    tollsCost: number;
    operatorSalary: number;
    otherExpenses: number;
  }) {
    const expenses =
      input.dieselCost +
      input.tollsCost +
      input.operatorSalary +
      input.otherExpenses;
    const utility = input.income - expenses;
    return { expenses, utility };
  }

  private async validateTripReferences(input: {
    clientId: string;
    driverId: string;
    trailerId: string;
    remolqueId?: string | null;
  }) {
    const [client, driver, trailer, remolque] = await Promise.all([
      this.prisma.client.findUnique({
        where: { id: input.clientId },
        select: { id: true, status: true },
      }),
      this.prisma.driver.findUnique({
        where: { id: input.driverId },
        select: { id: true, status: true },
      }),
      this.prisma.trailer.findUnique({
        where: { id: input.trailerId },
        select: { id: true, status: true },
      }),
      input.remolqueId
        ? this.prisma.remolque.findUnique({
            where: { id: input.remolqueId },
            select: { id: true, status: true },
          })
        : Promise.resolve(null),
    ]);

    if (!client) {
      throw new BadRequestException('Cliente inválido: selecciona un cliente existente.');
    }
    if (client.status !== 'ACTIVE') {
      throw new BadRequestException('Cliente inactivo: selecciona un cliente activo.');
    }

    if (!driver) {
      throw new BadRequestException('Conductor inválido: selecciona un conductor existente.');
    }
    if (driver.status !== 'ACTIVE') {
      throw new BadRequestException('Conductor inactivo: selecciona un conductor activo.');
    }

    if (!trailer) {
      throw new BadRequestException('Unidad inválida: selecciona una unidad existente.');
    }
    if (trailer.status !== 'ACTIVE') {
      throw new BadRequestException('Unidad inactiva: selecciona una unidad activa.');
    }

    if (input.remolqueId && !remolque) {
      throw new BadRequestException('Remolque inválido: selecciona un remolque existente.');
    }
    if (remolque && remolque.status !== 'ACTIVE') {
      throw new BadRequestException('Remolque inactivo: selecciona un remolque activo.');
    }
  }

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [active, completed, monthIncome, monthTripExpenses, monthMaintenanceExpenses, maintenanceInProgress] =
      await this.prisma.$transaction([
        this.prisma.trip.count({
          where: { status: { in: ['CREATED', 'IN_PROGRESS'] } },
        }),
        this.prisma.trip.count({
          where: {
            status: 'COMPLETED',
            updatedAt: { gte: startOfMonth },
          },
        }),
        this.prisma.trip.aggregate({
          where: {
            status: 'COMPLETED',
            updatedAt: { gte: startOfMonth },
          },
          _sum: { income: true },
        }),
        this.prisma.trip.aggregate({
          where: {
            status: 'COMPLETED',
            updatedAt: { gte: startOfMonth },
          },
          _sum: { expenses: true },
        }),
        this.prisma.maintenance.aggregate({
          where: {
            status: 'CLOSED',
            maintenanceDate: { gte: startOfMonth },
          },
          _sum: { totalCost: true },
        }),
        this.prisma.maintenance.count({
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        }),
      ]);

    const income = Number(monthIncome._sum.income ?? 0);
    const tripExpenses = Number(monthTripExpenses._sum.expenses ?? 0);
    const maintenanceExpenses = Number(monthMaintenanceExpenses._sum.totalCost ?? 0);
    const expenses = tripExpenses + maintenanceExpenses;
    const utility = income - expenses;

    return {
      activeTrips: active,
      completedTrips: completed,
      monthIncome: income,
      monthExpenses: expenses,
      monthUtility: utility,
      unitsInMaintenance: maintenanceInProgress,
    };
  }
}

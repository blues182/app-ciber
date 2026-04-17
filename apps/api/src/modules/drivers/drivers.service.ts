import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateDriverDto, UpdateDriverDto } from './drivers.dto.js';

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(search?: string, page = 1, pageSize = 20) {
    const where = {
      ...(search ? { fullName: { contains: search } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.driver.findMany({
        where,
        orderBy: { fullName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.driver.count({ where }),
    ]);
    return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException(`Conductor ${id} no encontrado.`);
    return driver;
  }

  async create(dto: CreateDriverDto, userId: string) {
    const driver = await this.prisma.driver.create({
      data: {
        fullName: dto.fullName,
        licenseNumber: dto.licenseNumber,
        licenseExpiry: new Date(dto.licenseExpiry),
      },
    });
    await this.audit.log(userId, 'drivers', 'CREATE', driver.id, { fullName: dto.fullName });
    return driver;
  }

  async update(id: string, dto: UpdateDriverDto, userId: string) {
    await this.findOne(id);
    const updated = await this.prisma.driver.update({
      where: { id },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName } : {}),
        ...(dto.licenseNumber ? { licenseNumber: dto.licenseNumber } : {}),
        ...(dto.licenseExpiry ? { licenseExpiry: new Date(dto.licenseExpiry) } : {}),
      },
    });
    await this.audit.log(userId, 'drivers', 'UPDATE', id);
    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    const [tripCount, documentCount] = await Promise.all([
      this.prisma.trip.count({ where: { driverId: id } }),
      this.prisma.document.count({ where: { driverId: id } }),
    ]);

    if (tripCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar: el conductor tiene ${tripCount} viaje(s) relacionado(s).`,
      );
    }
    if (documentCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar: el conductor tiene documentos relacionados.',
      );
    }

    await this.prisma.driver.delete({
      where: { id },
    });
    await this.audit.log(userId, 'drivers', 'DELETE', id);
    return { ok: true };
  }
}

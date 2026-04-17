import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateRemolqueDto, UpdateRemolqueDto } from './remolques.dto.js';

@Injectable()
export class RemolquesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(search?: string, page = 1, pageSize = 20) {
    const where = {
      ...(search ? { economicNumber: { contains: search } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.remolque.findMany({
        where,
        orderBy: { economicNumber: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.remolque.count({ where }),
    ]);
    return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string) {
    const remolque = await this.prisma.remolque.findUnique({ where: { id } });
    if (!remolque) throw new NotFoundException(`Remolque ${id} no encontrado.`);
    return remolque;
  }

  async create(dto: CreateRemolqueDto, userId: string) {
    const exists = await this.prisma.remolque.findUnique({
      where: { economicNumber: dto.economicNumber },
    });
    if (exists) throw new ConflictException(`Número económico ${dto.economicNumber} ya existe.`);
    const remolque = await this.prisma.remolque.create({ data: dto });
    await this.audit.log(userId, 'remolques', 'CREATE', remolque.id, { economicNumber: dto.economicNumber });
    return remolque;
  }

  async update(id: string, dto: UpdateRemolqueDto, userId: string) {
    await this.findOne(id);
    if (dto.economicNumber) {
      const conflict = await this.prisma.remolque.findFirst({
        where: { economicNumber: dto.economicNumber, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`Número económico ${dto.economicNumber} ya existe.`);
    }
    const updated = await this.prisma.remolque.update({ where: { id }, data: dto });
    await this.audit.log(userId, 'remolques', 'UPDATE', id);
    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    const [tripCount, maintenanceCount, documentCount] = await Promise.all([
      this.prisma.trip.count({ where: { remolqueId: id } }),
      this.prisma.maintenance.count({ where: { remolqueId: id } }),
      this.prisma.document.count({ where: { remolqueId: id } }),
    ]);

    if (tripCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar: el remolque tiene ${tripCount} viaje(s) relacionado(s).`,
      );
    }
    if (maintenanceCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar: el remolque tiene ${maintenanceCount} mantenimiento(s) relacionado(s).`,
      );
    }
    if (documentCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar: el remolque tiene documentos relacionados.',
      );
    }

    await this.prisma.remolque.delete({ where: { id } });
    await this.audit.log(userId, 'remolques', 'DELETE', id);
    return { ok: true };
  }
}

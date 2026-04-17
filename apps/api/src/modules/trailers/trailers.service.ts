import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateTrailerDto, UpdateTrailerDto } from './trailers.dto.js';

@Injectable()
export class TrailersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(search?: string, page = 1, pageSize = 20) {
    const where = {
      ...(search ? { economicNumber: { contains: search } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.trailer.findMany({
        where,
        orderBy: { economicNumber: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.trailer.count({ where }),
    ]);
    return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string) {
    const trailer = await this.prisma.trailer.findUnique({ where: { id } });
    if (!trailer) throw new NotFoundException(`Trailer ${id} no encontrado.`);
    return trailer;
  }

  async create(dto: CreateTrailerDto, userId: string) {
    const exists = await this.prisma.trailer.findUnique({
      where: { economicNumber: dto.economicNumber },
    });
    if (exists) throw new ConflictException(`Número económico ${dto.economicNumber} ya existe.`);
    const trailer = await this.prisma.trailer.create({ data: dto });
    await this.audit.log(userId, 'trailers', 'CREATE', trailer.id, { economicNumber: dto.economicNumber });
    return trailer;
  }

  async update(id: string, dto: UpdateTrailerDto, userId: string) {
    await this.findOne(id);
    if (dto.economicNumber) {
      const conflict = await this.prisma.trailer.findFirst({
        where: { economicNumber: dto.economicNumber, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`Número económico ${dto.economicNumber} ya existe.`);
    }
    const updated = await this.prisma.trailer.update({ where: { id }, data: dto });
    await this.audit.log(userId, 'trailers', 'UPDATE', id);
    return updated;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    const [tripCount, maintenanceCount, documentCount] = await Promise.all([
      this.prisma.trip.count({ where: { trailerId: id } }),
      this.prisma.maintenance.count({ where: { trailerId: id } }),
      this.prisma.document.count({ where: { trailerId: id } }),
    ]);

    if (tripCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar: la unidad tiene ${tripCount} viaje(s) relacionado(s).`,
      );
    }
    if (maintenanceCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar: la unidad tiene ${maintenanceCount} mantenimiento(s) relacionado(s).`,
      );
    }
    if (documentCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar: la unidad tiene documentos relacionados.',
      );
    }

    await this.prisma.trailer.delete({ where: { id } });
    await this.audit.log(userId, 'trailers', 'DELETE', id);
    return { ok: true };
  }
}

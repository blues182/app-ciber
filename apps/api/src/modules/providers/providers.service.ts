import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateProviderDto, UpdateProviderDto } from './providers.dto.js';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(search?: string, page = 1, pageSize = 20) {
    const where = {
      ...(search ? { businessName: { contains: search } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.provider.findMany({
        where,
        orderBy: { businessName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.provider.count({ where }),
    ]);
    return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException(`Proveedor ${id} no encontrado.`);
    return provider;
  }

  async create(dto: CreateProviderDto, userId: string) {
    const provider = await this.prisma.provider.create({ data: dto });
    await this.audit.log(userId, 'providers', 'CREATE', provider.id, { businessName: dto.businessName });
    return provider;
  }

  async update(id: string, dto: UpdateProviderDto, userId: string) {
    await this.findOne(id);
    const updated = await this.prisma.provider.update({ where: { id }, data: dto });
    await this.audit.log(userId, 'providers', 'UPDATE', id);
    return updated;
  }

  async deactivate(id: string, userId: string) {
    await this.findOne(id);
    const updated = await this.prisma.provider.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    await this.audit.log(userId, 'providers', 'DEACTIVATE', id);
    return updated;
  }
}

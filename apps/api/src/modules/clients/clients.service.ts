import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateClientDto, UpdateClientDto } from './clients.dto.js';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(search?: string, page = 1, pageSize = 20) {
    const where = {
      ...(search ? { businessName: { contains: search } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: { businessName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.client.count({ where }),
    ]);
    return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException(`Cliente ${id} no encontrado.`);
    return client;
  }

  async create(dto: CreateClientDto, userId: string) {
    const client = await this.prisma.client.create({
      data: {
        businessName: dto.businessName,
        taxId: dto.taxId,
        phone: dto.phone,
        email: dto.email,
      },
    });
    await this.audit.log(userId, 'clients', 'CREATE', client.id, { businessName: dto.businessName });
    return client;
  }

  async update(id: string, dto: UpdateClientDto, userId: string) {
    await this.findOne(id);
    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.businessName ? { businessName: dto.businessName } : {}),
        ...(dto.taxId !== undefined ? { taxId: dto.taxId } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
      },
    });
    await this.audit.log(userId, 'clients', 'UPDATE', id);
    return updated;
  }

  async deactivate(id: string, userId: string) {
    await this.findOne(id);
    const updated = await this.prisma.client.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    await this.audit.log(userId, 'clients', 'DEACTIVATE', id);
    return updated;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'DEACTIVATE'
  | 'TRIP_CLOSE'
  | 'MAINTENANCE_CLOSE'
  | 'INVENTORY_MOVEMENT';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    module?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { module, action, userId, from, to, page = 1, pageSize = 30 } = filters;
    const where: Record<string, unknown> = {};

    if (module) where['module'] = module;
    if (action) where['action'] = action;
    if (userId) where['userId'] = userId;
    if (from || to) {
      where['createdAt'] = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((item: {
        metadata: string | null;
        [key: string]: unknown;
      }) => ({
        ...item,
        metadata: item.metadata ? JSON.parse(item.metadata) : null,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  log(
    userId: string,
    module: string,
    action: AuditActionType,
    recordId: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        module,
        action: action as never,
        recordId,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateDocumentDto, DocumentEntityType, DocumentsQueryDto } from './documents.dto.js';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: DocumentsQueryDto, page = 1, pageSize = 20) {
    const where: Record<string, unknown> = {};
    if (query.search) {
      where['fileName'] = { contains: query.search };
    }
    if (query.entityType) {
      where[this.getEntityColumn(query.entityType)] = query.entityId
        ? query.entityId
        : { not: null };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items: items.map((item: {
        trailerId: string | null;
        remolqueId: string | null;
        driverId: string | null;
        tripId: string | null;
        maintenanceId: string | null;
        [key: string]: unknown;
      }) => ({
        ...item,
        entityType: this.detectEntityType(item),
        entityId:
          item.trailerId ?? item.remolqueId ?? item.driverId ?? item.tripId ?? item.maintenanceId,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async create(file: Express.Multer.File, dto: CreateDocumentDto, userId: string) {
    const document = await this.prisma.document.create({
      data: {
        fileName: file.originalname,
        fileUrl: file.filename,
        mimeType: file.mimetype,
        [this.getEntityColumn(dto.entityType)]: dto.entityId,
      },
    });

    await this.audit.log(userId, 'documents', 'CREATE', document.id, {
      entityType: dto.entityType,
      entityId: dto.entityId,
      fileName: file.originalname,
    });

    return {
      ...document,
      entityType: dto.entityType,
      entityId: dto.entityId,
      downloadUrl: `/api/documents/${document.id}/download`,
    };
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException(`Documento ${id} no encontrado.`);
    return document;
  }

  async download(id: string) {
    const document = await this.findOne(id);
    const filePath = join(process.cwd(), 'uploads', document.fileUrl);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Archivo físico no encontrado.');
    }
    return {
      document,
      stream: createReadStream(filePath),
    };
  }

  private getEntityColumn(entityType: DocumentEntityType) {
    return {
      trailer: 'trailerId',
      remolque: 'remolqueId',
      driver: 'driverId',
      trip: 'tripId',
      maintenance: 'maintenanceId',
    }[entityType];
  }

  private detectEntityType(document: {
    trailerId: string | null;
    remolqueId: string | null;
    driverId: string | null;
    tripId: string | null;
    maintenanceId: string | null;
  }) {
    if (document.trailerId) return 'trailer';
    if (document.remolqueId) return 'remolque';
    if (document.driverId) return 'driver';
    if (document.tripId) return 'trip';
    return 'maintenance';
  }
}

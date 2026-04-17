import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateRoleDto,
  CreateUserDto,
  UpdateRoleDto,
  UpdateUserDto,
} from './users.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async list(search?: string, page = 1, pageSize = 20) {
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { role: { name: { contains: search } } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          roleId: true,
          role: {
            select: { id: true, name: true },
          },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role: {
      id: string;
      name: string;
      createdAt: Date;
      _count: { users: number };
      permissions: { permission: { id: string; module: string; action: string; createdAt: Date } }[];
    }) => ({
      id: role.id,
      name: role.name,
      usersCount: role._count.users,
      permissions: role.permissions.map((item: { permission: { id: string; module: string; action: string; createdAt: Date } }) => item.permission),
      createdAt: role.createdAt,
    }));
  }

  listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  async createUser(dto: CreateUserDto, userId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`El correo ${dto.email} ya existe.`);
    }

    await this.ensureRole(dto.roleId);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        roleId: dto.roleId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        roleId: true,
        role: { select: { id: true, name: true } },
        createdAt: true,
      },
    });

    await this.audit.log(userId, 'users', 'CREATE', user.id, { email: user.email });
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, userId: string) {
    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException(`Usuario ${id} no encontrado.`);
    }

    if (dto.email && dto.email !== current.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (conflict) {
        throw new ConflictException(`El correo ${dto.email} ya existe.`);
      }
    }

    if (dto.roleId) {
      await this.ensureRole(dto.roleId);
    }

    const data: Record<string, unknown> = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.roleId !== undefined && { roleId: dto.roleId }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    if (dto.password) {
      data['passwordHash'] = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: data as never,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        roleId: true,
        role: { select: { id: true, name: true } },
        createdAt: true,
      },
    });

    await this.audit.log(userId, 'users', 'UPDATE', id, {
      email: updated.email,
      isActive: updated.isActive,
    });

    return updated;
  }

  async createRole(dto: CreateRoleDto, userId: string) {
    const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`El rol ${dto.name} ya existe.`);
    }

    await this.ensurePermissions(dto.permissionIds);

    const role = await this.prisma.role.create({ data: { name: dto.name } });
    if (dto.permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    await this.audit.log(userId, 'users', 'CREATE', role.id, { role: role.name, type: 'role' });
    return this.getRole(role.id);
  }

  async updateRole(id: string, dto: UpdateRoleDto, userId: string) {
    const current = await this.prisma.role.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException(`Rol ${id} no encontrado.`);
    }

    if (dto.name && dto.name !== current.name) {
      const conflict = await this.prisma.role.findUnique({ where: { name: dto.name } });
      if (conflict) {
        throw new ConflictException(`El rol ${dto.name} ya existe.`);
      }
    }

    if (dto.permissionIds) {
      await this.ensurePermissions(dto.permissionIds);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
        },
      });

      if (dto.permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (dto.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: dto.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
          });
        }
      }
    });

    await this.audit.log(userId, 'users', 'UPDATE', id, { type: 'role' });
    return this.getRole(id);
  }

  private async getRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Rol ${id} no encontrado.`);
    }

    return {
      id: role.id,
      name: role.name,
      usersCount: role._count.users,
      permissions: role.permissions.map((item: { permission: { id: string; module: string; action: string; createdAt: Date } }) => item.permission),
      createdAt: role.createdAt,
    };
  }

  private async ensureRole(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Rol ${roleId} no encontrado.`);
    }
    return role;
  }

  private async ensurePermissions(permissionIds: string[]) {
    if (permissionIds.length === 0) {
      return;
    }
    const count = await this.prisma.permission.count({ where: { id: { in: permissionIds } } });
    if (count !== permissionIds.length) {
      throw new NotFoundException('Uno o más permisos no existen.');
    }
  }
}

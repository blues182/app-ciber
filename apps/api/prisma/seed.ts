import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  const permissions = [
    ['users', 'read'],
    ['users', 'create'],
    ['trips', 'read'],
    ['trips', 'create'],
    ['trailers', 'read'],
    ['trailers', 'create'],
    ['drivers', 'read'],
    ['drivers', 'create'],
    ['clients', 'read'],
    ['clients', 'create'],
    ['providers', 'read'],
    ['providers', 'create'],
    ['maintenance', 'read'],
    ['maintenance', 'create'],
    ['inventory', 'read'],
    ['inventory', 'create'],
    ['reports', 'read'],
    ['audit', 'read'],
    ['documents', 'read'],
    ['documents', 'create'],
  ];

  for (const [module, action] of permissions) {
    const permission = await prisma.permission.upsert({
      where: { module_action: { module, action } },
      update: {},
      create: { module, action },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  const passwordHash = await bcrypt.hash('Admin1234', 10);
  await prisma.user.upsert({
    where: { email: 'admin@appciber.local' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@appciber.local',
      passwordHash,
      roleId: adminRole.id,
    },
  });

  console.log('Seed completado. Usuario: admin@appciber.local / Admin1234');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

# App Ciber

Base inicial de plataforma administrativa para transporte.

## Requisitos

- Node.js 20+
- MariaDB 10.6+

## Iniciar

1. Instalar dependencias:
   - `npm install`
2. Configurar variables de entorno en `apps/api/.env`.
3. Generar cliente Prisma y aplicar migraciones:
   - `npm run prisma:generate -w @app-ciber/api`
   - `npm run prisma:migrate -w @app-ciber/api`
4. Levantar API + Web:
   - `npm run dev`

## Apps

- `apps/api`: backend NestJS + Prisma + MariaDB
- `apps/web`: frontend Next.js + Tailwind

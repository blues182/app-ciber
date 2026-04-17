# API App Ciber

Backend construido con NestJS + Prisma + MariaDB.

## Endpoints iniciales

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/users` (requiere permiso `users.read`)
- `GET /api/trips` (requiere permiso `trips.read`)

## Variables de entorno

Copiar `apps/api/.env.example` a `apps/api/.env`.

## Prisma

1. Generar cliente:
   - `npm run prisma:generate -w @app-ciber/api`
2. Migrar base:
   - `npm run prisma:migrate -w @app-ciber/api`
3. Semilla:
   - `npx prisma db seed --schema prisma/schema.prisma`

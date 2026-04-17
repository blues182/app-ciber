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

## Despliegue (Produccion con Docker)

Este flujo levanta base de datos, API y Web en un solo comando.

1. Copiar variables de produccion:
   - `copy .env.prod.example .env.prod`
   - Edita secretos y dominio/IP en `.env.prod`.

2. Construir y levantar servicios:
   - `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build`

3. Verificar salud:
   - API: `http://TU_IP_O_DOMINIO:4000/api/health`
   - Web: `http://TU_IP_O_DOMINIO:3001`

4. Ver logs si hace falta:
   - `docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api web db`

5. Actualizar en el futuro:
   - `git pull`
   - `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build`

Notas:
- El contenedor API aplica migraciones automaticamente al iniciar.
- Si vas a exponer publicamente, agrega Nginx o Cloudflare Tunnel para SSL y dominio.

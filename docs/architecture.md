# Arquitectura propuesta

## Enfoque

- Monorepo con dos aplicaciones:
  - `apps/api`: NestJS + Prisma + MariaDB
  - `apps/web`: Next.js + Tailwind
- Separacion por modulos de dominio para escalar sin rehacer base.

## Capas backend

- `modules/*`: logica de negocio por modulo.
- `common/*`: guards, decoradores y utilidades transversales.
- `prisma/*`: acceso a datos.

## Seguridad

- JWT para autenticacion.
- RBAC con permisos granulares por modulo y accion.
- Auditoria para acciones criticas.

## Base de datos (MariaDB)

Entidades base ya modeladas:
- usuarios, roles, permisos
- viajes
- trailers y remolques
- conductores
- clientes y proveedores
- mantenimiento
- inventario de refacciones y movimientos
- documentos
- auditoria

## Escalabilidad

- Cada modulo podra exponer controlador, servicio, DTOs y repositorios.
- Se puede evolucionar a arquitectura de eventos para integraciones futuras.

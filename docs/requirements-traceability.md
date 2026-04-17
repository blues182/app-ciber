# Trazabilidad de requisitos

## Estado inicial por modulo

- RF-01 Autenticacion: base iniciada (login JWT).
- RF-02 Usuarios: lectura inicial con guard de permisos.
- RF-03 Dashboard: vista inicial con KPIs de ejemplo.
- RF-04/RF-05 Viajes: listado con filtros y paginacion base.
- RF-06 a RF-10 Catalogos operativos: pendientes de CRUD completo.
- RF-11 a RF-13 Mantenimiento y reporte mensual: esquema de datos listo, API pendiente.
- RF-14 Inventario: esquema de datos listo, API pendiente.
- RF-15 Documentos: esquema de datos listo, carga de archivos pendiente.
- RF-16 Reportes: pendiente implementacion de exportadores PDF/Excel.
- RF-17 Auditoria: modelo listo, middleware de registro pendiente.

## Reglas de negocio cubiertas parcialmente

- RN-05 mantenimiento ligado a unidad: lista a validar en servicios.
- RN-06 descuento de inventario por mantenimiento: listo en modelo, pendiente en logica.
- RN-07 auditoria critica: pendiente hook global por acciones.
- RN-08 busqueda orden exacta/parcial: parcial implementado (contains), exacta pendiente.

## Proximas historias recomendadas

1. CRUD completo de trailers, remolques, conductores, clientes y proveedores.
2. Flujo completo de mantenimiento con uso de refacciones y cierre.
3. Auditoria automatica para altas, ediciones, bajas logicas y cierres.
4. Reporte mensual imprimible por unidad.
5. Modulo de documentos con almacenamiento S3 compatible.
